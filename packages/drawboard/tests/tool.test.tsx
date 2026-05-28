import React from "react";

import { resolvablePromise } from "@drawboard/common";

import { Drawboard } from "../index";

import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

import type { DrawboardImperativeAPI } from "../types";

describe("setActiveTool()", () => {
  const h = window.h;

  let drawboardAPI: DrawboardImperativeAPI;

  const mouse = new Pointer("mouse");

  beforeEach(async () => {
    const drawboardAPIPromise = resolvablePromise<DrawboardImperativeAPI>();
    await render(
      <Drawboard
        drawboardAPI={(api) => drawboardAPIPromise.resolve(api as any)}
      />,
    );
    drawboardAPI = await drawboardAPIPromise;
  });

  it("should expose setActiveTool on package API", () => {
    expect(drawboardAPI.setActiveTool).toBeDefined();
    expect(drawboardAPI.setActiveTool).toBe(h.app.setActiveTool);
  });

  it("should set the active tool type", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawboardAPI.setActiveTool({ type: "rectangle" });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("selection");
  });

  it("should support tool locking", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawboardAPI.setActiveTool({ type: "rectangle", locked: true });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("rectangle");
  });

  it("should set custom tool", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      drawboardAPI.setActiveTool({ type: "custom", customType: "comment" });
    });
    expect(h.state.activeTool.type).toBe("custom");
    expect(h.state.activeTool.customType).toBe("comment");
  });
});
