/**
 * AI feature wiring for Drawboard.
 *
 * Uses Groq (primary, free tier, generous limits) with OpenRouter as fallback.
 * Set VITE_APP_GROQ_API_KEY and/or VITE_APP_OPENROUTER_API_KEY in your .env file.
 *
 * Features powered:
 *   1. Text → Diagram  (TTDDialog)  – streams Mermaid code
 *   2. Diagram → Code  (DiagramToCodePlugin) – sends a canvas screenshot and
 *      receives a self-contained HTML page
 */

import {
  DiagramToCodePlugin,
  exportToBlob,
  getTextFromElements,
  MIME_TYPES,
  TTDDialog,
} from "@drawboard/drawboard";
import { getDataURL } from "@drawboard/drawboard/data/blob";
import { RequestError } from "@drawboard/drawboard/errors";

import { TTDIndexedDBAdapter } from "../data/TTDStorage";

import type { DrawboardImperativeAPI } from "@drawboard/drawboard/types";
import type { LLMMessage } from "@drawboard/drawboard/components/TTDDialog/types";

// ---------------------------------------------------------------------------
// API config
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Provider config — Groq (primary) or OpenRouter (fallback)
// ---------------------------------------------------------------------------

// Groq: free tier, 30 req/min, 14 400 req/day, OpenAI-compatible
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const GROQ_VISION_MODEL = "llama-3.2-90b-vision-preview"; // vision-capable

// OpenRouter: fallback if no Groq key, needs credit balance for free models
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OR_TEXT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const OR_VISION_MODEL = "google/gemma-3-27b-it:free";

interface Provider {
  endpoint: string;
  textModel: string;
  visionModel: string;
  headers: (key: string) => Record<string, string>;
}

const GROQ_PROVIDER: Provider = {
  endpoint: GROQ_ENDPOINT,
  textModel: GROQ_TEXT_MODEL,
  visionModel: GROQ_VISION_MODEL,
  headers: (key) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  }),
};

const OPENROUTER_PROVIDER: Provider = {
  endpoint: OPENROUTER_ENDPOINT,
  textModel: OR_TEXT_MODEL,
  visionModel: OR_VISION_MODEL,
  headers: (key) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    "HTTP-Referer": "https://drawboard.com",
    "X-Title": "Drawboard",
  }),
};

/** Returns the configured provider + key, or null if neither key is set. */
const getProviderAndKey = (): { provider: Provider; key: string } | null => {
  const groqKey = import.meta.env.VITE_APP_GROQ_API_KEY as string | undefined;
  if (groqKey) {
    return { provider: GROQ_PROVIDER, key: groqKey };
  }

  const orKey = import.meta.env.VITE_APP_OPENROUTER_API_KEY as
    | string
    | undefined;
  if (orKey) {
    return { provider: OPENROUTER_PROVIDER, key: orKey };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Rate-limit resilient fetch — tries each model in order, waits briefly on 429
// ---------------------------------------------------------------------------

/**
 * Calls the provider endpoint. On 429 waits briefly and retries once before
 * giving up.
 */
async function fetchAI(
  provider: Provider,
  key: string,
  body: object,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers(key),
      body: JSON.stringify(body),
      signal,
    });

    if (response.ok) {
      return response;
    }

    const status = response.status;
    const bodyText = await response.text();

    if (status === 429 && attempt === 0) {
      // Wait 2 s and retry once
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    const errMsg = aiErrorMessage(status, bodyText);
    throw Object.assign(new Error(errMsg), { status });
  }

  // Should never reach here, but satisfy TS
  throw new Error("Request failed after retries.");
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const TEXT_TO_DIAGRAM_SYSTEM = `\
You are an expert Mermaid diagram generator embedded in a whiteboard app.

Rules — follow them strictly:
1. Respond with ONLY valid Mermaid diagram syntax.
2. No explanations, no markdown code fences (\`\`\`mermaid or \`\`\`), no commentary.
3. Start your response with the diagram type keyword (e.g. "flowchart TD", "sequenceDiagram", "erDiagram").
4. When the user asks to fix or repair a diagram, return only the corrected Mermaid code.
5. If a request is genuinely ambiguous, make a reasonable diagram and keep it simple.

Supported types: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, gitGraph, mindmap, timeline, xychart-beta.

Style guidelines:
- Use clear, short labels on nodes and edges
- Prefer top-down (TD) or left-right (LR) for flowcharts
- Keep diagrams focused — one concept per diagram
- Use subgraphs / groups when they improve clarity`;

const DIAGRAM_TO_CODE_SYSTEM = `\
You are an expert frontend developer.

Given an image of a diagram, wireframe, sketch, or UI mockup (plus optional text labels), generate a complete, self-contained HTML page that faithfully implements the design.

Rules:
1. Return ONLY the HTML — starting with <!DOCTYPE html> and ending with </html>.
2. No explanations, no markdown fences, no commentary outside the HTML.
3. All CSS must be in a <style> tag inside <head>.
4. All JavaScript (if any) must be in a <script> tag at the end of <body>.
5. Use semantic HTML5 elements.
6. Make it visually polished: good colors, spacing, and typography.
7. Ensure it is responsive (works on mobile and desktop).
8. Do not reference external resources — everything must be self-contained.`;

// ---------------------------------------------------------------------------
// OpenAI-compatible SSE streaming helper
// ---------------------------------------------------------------------------

/**
 * Reads an OpenAI-compatible SSE stream and calls `onDelta` for each text token.
 * Returns the full concatenated response string.
 * Works with OpenRouter streaming responses.
 */
async function streamOpenAISSE(
  response: Response,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No readable body in response.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      if (signal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }

        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") {
          continue;
        }

        try {
          const event = JSON.parse(data) as {
            choices?: Array<{
              delta?: { content?: string | null };
              finish_reason?: string | null;
            }>;
          };

          const delta = event.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onDelta(delta);
          }
        } catch {
          // malformed SSE chunk — skip silently
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

const aiErrorMessage = (status: number, body: string): string => {
  if (status === 401) {
    return "Invalid API key. Check VITE_APP_GROQ_API_KEY or VITE_APP_OPENROUTER_API_KEY.";
  }
  if (status === 429) {
    return "Rate limit reached — retrying automatically. If this keeps happening, wait a minute.";
  }
  if (status === 503) {
    return "AI service temporarily unavailable. Please try again shortly.";
  }
  try {
    const json = JSON.parse(body) as { error?: { message?: string } };
    if (json.error?.message) {
      return json.error.message;
    }
  } catch {
    // ignore
  }
  return body || `Request failed (HTTP ${status})`;
};

const NO_KEY_ERROR = new RequestError({
  message:
    "AI not configured. Add VITE_APP_GROQ_API_KEY=gsk_... to your .env file and restart. " +
    "Get a free key at console.groq.com (no credit card needed).",
  status: 500,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AIComponents = ({
  drawboardAPI,
}: {
  drawboardAPI: DrawboardImperativeAPI;
}) => {
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Diagram → Code                                                       */}
      {/* ------------------------------------------------------------------ */}
      <DiagramToCodePlugin
        generate={async ({ frame, children }) => {
          const config = getProviderAndKey();
          if (!config) {
            throw new Error(NO_KEY_ERROR.message);
          }
          const { provider, key } = config;

          const appState = drawboardAPI.getAppState();

          // Export the selected frame as a JPEG screenshot.
          const blob = await exportToBlob({
            elements: children,
            appState: {
              ...appState,
              exportBackground: true,
              viewBackgroundColor: appState.viewBackgroundColor,
            },
            exportingFrame: frame,
            files: drawboardAPI.getFiles(),
            mimeType: MIME_TYPES.jpg,
          });

          const dataURL = await getDataURL(blob);
          const base64 = dataURL.replace(/^data:image\/jpeg;base64,/, "");
          const textLabels = getTextFromElements(children);

          // OpenAI vision format: image_url with data URI
          const userParts: unknown[] = [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
          ];

          if (textLabels.trim().length > 0) {
            userParts.push({
              type: "text",
              text: `Text elements visible in the diagram:\n${textLabels}`,
            });
          }

          const response = await fetchAI(provider, key, {
            model: provider.visionModel,
            max_tokens: 8192,
            messages: [
              { role: "system", content: DIAGRAM_TO_CODE_SYSTEM },
              { role: "user", content: userParts },
            ],
          });

          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };

          const html = json.choices?.[0]?.message?.content ?? "";

          if (!html) {
            throw new Error("AI returned an empty response. Please try again.");
          }
          return { html };
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Text → Diagram (streaming)                                           */}
      {/* ------------------------------------------------------------------ */}
      <TTDDialog
        onTextSubmit={async ({
          messages,
          onChunk,
          onStreamCreated,
          signal,
        }) => {
          const config = getProviderAndKey();
          if (!config) {
            return { error: NO_KEY_ERROR };
          }
          const { provider, key } = config;

          try {
            let response: Response;
            try {
              response = await fetchAI(
                provider,
                key,
                {
                  model: provider.textModel,
                  max_tokens: 4096,
                  stream: true,
                  messages: [
                    { role: "system", content: TEXT_TO_DIAGRAM_SYSTEM },
                    ...messages.map((m: LLMMessage) => ({
                      role: m.role,
                      content: m.content,
                    })),
                  ],
                },
                signal,
              );
            } catch (fetchErr: any) {
              if (fetchErr?.name === "AbortError" || signal?.aborted) {
                return {
                  error: new RequestError({
                    message: "Request cancelled.",
                    status: 499,
                  }),
                };
              }
              const status = fetchErr?.status ?? 500;
              return {
                error: new RequestError({
                  message: fetchErr?.message || aiErrorMessage(status, ""),
                  status,
                }),
              };
            }

            // Signal to the UI that the stream has begun (shows the streaming
            // indicator and enables the Stop button).
            onStreamCreated?.();

            const generatedResponse = await streamOpenAISSE(
              response,
              (delta) => onChunk?.(delta),
              signal,
            );

            if (!generatedResponse.trim()) {
              return {
                error: new RequestError({
                  message: "AI returned an empty response. Please try again.",
                  status: 500,
                }),
              };
            }

            return { generatedResponse, error: null };
          } catch (err: any) {
            if (err?.name === "AbortError" || signal?.aborted) {
              return {
                error: new RequestError({
                  message: "Request cancelled.",
                  status: 499,
                }),
              };
            }
            return {
              error: new RequestError({
                message:
                  err?.message || "Request failed. Check your connection.",
                status: 500,
              }),
            };
          }
        }}
        persistenceAdapter={TTDIndexedDBAdapter}
      />
    </>
  );
};
