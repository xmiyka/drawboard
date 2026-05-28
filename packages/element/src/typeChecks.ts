import { ROUNDNESS, assertNever } from "@drawboard/common";

import { pointsEqual } from "@drawboard/math";

import type { ElementOrToolType } from "@drawboard/drawboard/types";

import type { MarkNonNullable } from "@drawboard/common/utility-types";

import type {
  DrawboardElement,
  DrawboardTextElement,
  DrawboardEmbeddableElement,
  DrawboardLinearElement,
  DrawboardBindableElement,
  DrawboardFreeDrawElement,
  InitializedDrawboardImageElement,
  DrawboardImageElement,
  DrawboardTextElementWithContainer,
  DrawboardTextContainer,
  DrawboardFrameElement,
  RoundnessType,
  DrawboardFrameLikeElement,
  DrawboardElementType,
  DrawboardIframeElement,
  DrawboardIframeLikeElement,
  DrawboardMagicFrameElement,
  DrawboardArrowElement,
  DrawboardElbowArrowElement,
  DrawboardLineElement,
  DrawboardFlowchartNodeElement,
  DrawboardLinearElementSubType,
} from "./types";

export const isInitializedImageElement = (
  element: DrawboardElement | null,
): element is InitializedDrawboardImageElement => {
  return !!element && element.type === "image" && !!element.fileId;
};

export const isImageElement = (
  element: DrawboardElement | null,
): element is DrawboardImageElement => {
  return !!element && element.type === "image";
};

export const isEmbeddableElement = (
  element: DrawboardElement | null | undefined,
): element is DrawboardEmbeddableElement => {
  return !!element && element.type === "embeddable";
};

export const isIframeElement = (
  element: DrawboardElement | null,
): element is DrawboardIframeElement => {
  return !!element && element.type === "iframe";
};

export const isIframeLikeElement = (
  element: DrawboardElement | null,
): element is DrawboardIframeLikeElement => {
  return (
    !!element && (element.type === "iframe" || element.type === "embeddable")
  );
};

export const isTextElement = (
  element: DrawboardElement | null,
): element is DrawboardTextElement => {
  return element != null && element.type === "text";
};

export const isFrameElement = (
  element: DrawboardElement | null,
): element is DrawboardFrameElement => {
  return element != null && element.type === "frame";
};

export const isMagicFrameElement = (
  element: DrawboardElement | null,
): element is DrawboardMagicFrameElement => {
  return element != null && element.type === "magicframe";
};

export const isFrameLikeElement = (
  element: DrawboardElement | null,
): element is DrawboardFrameLikeElement => {
  return (
    element != null &&
    (element.type === "frame" || element.type === "magicframe")
  );
};

export const isFreeDrawElement = (
  element?: DrawboardElement | null,
): element is DrawboardFreeDrawElement => {
  return element != null && isFreeDrawElementType(element.type);
};

export const isFreeDrawElementType = (
  elementType: DrawboardElementType,
): boolean => {
  return elementType === "freedraw";
};

export const isLinearElement = (
  element?: DrawboardElement | null,
): element is DrawboardLinearElement => {
  return element != null && isLinearElementType(element.type);
};

export const isLineElement = (
  element?: DrawboardElement | null,
): element is DrawboardLineElement => {
  return element != null && element.type === "line";
};

export const isArrowElement = (
  element?: DrawboardElement | null,
): element is DrawboardArrowElement => {
  return element != null && element.type === "arrow";
};

export const isElbowArrow = (
  element?: DrawboardElement,
): element is DrawboardElbowArrowElement => {
  return isArrowElement(element) && element.elbowed;
};

/**
 * sharp or curved arrow, but not elbow
 */
export const isSimpleArrow = (
  element?: DrawboardElement,
): element is DrawboardArrowElement => {
  return isArrowElement(element) && !element.elbowed;
};

export const isSharpArrow = (
  element?: DrawboardElement,
): element is DrawboardArrowElement => {
  return isArrowElement(element) && !element.elbowed && !element.roundness;
};

export const isCurvedArrow = (
  element?: DrawboardElement,
): element is DrawboardArrowElement => {
  return (
    isArrowElement(element) && !element.elbowed && element.roundness !== null
  );
};

export const isLinearElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return (
    elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
  );
};

export const isBindingElement = (
  element?: DrawboardElement | null,
  includeLocked = true,
): element is DrawboardArrowElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    isBindingElementType(element.type)
  );
};

export const isBindingElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return elementType === "arrow";
};

export const isBindableElement = (
  element: DrawboardElement | null | undefined,
  includeLocked = true,
): element is DrawboardBindableElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

export const isRectanguloidElement = (
  element?: DrawboardElement | null,
): element is DrawboardBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

// TODO: Remove this when proper distance calculation is introduced
// @see binding.ts:distanceToBindableElement()
export const isRectangularElement = (
  element?: DrawboardElement | null,
): element is DrawboardBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "image" ||
      element.type === "text" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      element.type === "freedraw")
  );
};

export const isTextBindableContainer = (
  element: DrawboardElement | null,
  includeLocked = true,
): element is DrawboardTextContainer => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      isArrowElement(element))
  );
};

export const isDrawboardElement = (
  element: any,
): element is DrawboardElement => {
  const type: DrawboardElementType | undefined = element?.type;
  if (!type) {
    return false;
  }
  switch (type) {
    case "text":
    case "diamond":
    case "rectangle":
    case "iframe":
    case "embeddable":
    case "ellipse":
    case "arrow":
    case "freedraw":
    case "line":
    case "frame":
    case "magicframe":
    case "image":
    case "selection": {
      return true;
    }
    default: {
      assertNever(type, null);
      return false;
    }
  }
};

export const isFlowchartNodeElement = (
  element: DrawboardElement,
): element is DrawboardFlowchartNodeElement => {
  return (
    element.type === "rectangle" ||
    element.type === "ellipse" ||
    element.type === "diamond"
  );
};

export const hasBoundTextElement = (
  element: DrawboardElement | null,
): element is MarkNonNullable<DrawboardBindableElement, "boundElements"> => {
  return (
    isTextBindableContainer(element) &&
    !!element.boundElements?.some(({ type }) => type === "text")
  );
};

export const isBoundToContainer = (
  element: DrawboardElement | null,
): element is DrawboardTextElementWithContainer => {
  return (
    element !== null &&
    "containerId" in element &&
    element.containerId !== null &&
    isTextElement(element)
  );
};

export const isArrowBoundToElement = (element: DrawboardArrowElement) => {
  return !!element.startBinding || !!element.endBinding;
};

export const isUsingAdaptiveRadius = (type: string) =>
  type === "rectangle" ||
  type === "embeddable" ||
  type === "iframe" ||
  type === "image";

export const isUsingProportionalRadius = (type: string) =>
  type === "line" || type === "arrow" || type === "diamond";

export const canApplyRoundnessTypeToElement = (
  roundnessType: RoundnessType,
  element: DrawboardElement,
) => {
  if (
    (roundnessType === ROUNDNESS.ADAPTIVE_RADIUS ||
      // if legacy roundness, it can be applied to elements that currently
      // use adaptive radius
      roundnessType === ROUNDNESS.LEGACY) &&
    isUsingAdaptiveRadius(element.type)
  ) {
    return true;
  }
  if (
    roundnessType === ROUNDNESS.PROPORTIONAL_RADIUS &&
    isUsingProportionalRadius(element.type)
  ) {
    return true;
  }

  return false;
};

export const getDefaultRoundnessTypeForElement = (
  element: DrawboardElement,
) => {
  if (isUsingProportionalRadius(element.type)) {
    return {
      type: ROUNDNESS.PROPORTIONAL_RADIUS,
    };
  }

  if (isUsingAdaptiveRadius(element.type)) {
    return {
      type: ROUNDNESS.ADAPTIVE_RADIUS,
    };
  }

  return null;
};

export const getLinearElementSubType = (
  element: DrawboardLinearElement,
): DrawboardLinearElementSubType => {
  if (isSharpArrow(element)) {
    return "sharpArrow";
  }
  if (isCurvedArrow(element)) {
    return "curvedArrow";
  }
  if (isElbowArrow(element)) {
    return "elbowArrow";
  }
  return "line";
};

/**
 * Checks if current element points meet all the conditions for polygon=true
 * (this isn't a element type check, for that use isLineElement).
 *
 * If you want to check if points *can* be turned into a polygon, use
 *  canBecomePolygon(points).
 */
export const isValidPolygon = (
  points: DrawboardLineElement["points"],
): boolean => {
  return points.length > 3 && pointsEqual(points[0], points[points.length - 1]);
};

export const canBecomePolygon = (
  points: DrawboardLineElement["points"],
): boolean => {
  return (
    points.length > 3 ||
    // 3-point polygons can't have all points in a single line
    (points.length === 3 && !pointsEqual(points[0], points[points.length - 1]))
  );
};
