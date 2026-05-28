# @drawboard/utils

## Install

```bash
npm install @drawboard/utils
```

If you prefer Yarn over npm, use this command to install the Drawboard utils package:

```bash
yarn add @drawboard/utils
```

## API

### `serializeAsJSON`

See [`serializeAsJSON`](https://github.com/drawboard/drawboard/blob/master/src/packages/drawboard/README.md#serializeAsJSON) for API and description.

### `exportToBlob` (async)

Export an Drawboard diagram to a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

### `exportToSvg`

Export an Drawboard diagram to a [SVGElement](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement).

## Usage

Drawboard utils is published as a UMD (Universal Module Definition). If you are using a module bundler (for instance, Webpack), you can import it as an ES6 module:

```js
import { exportToSvg, exportToBlob } from "@drawboard/utils";
```

To use it in a browser directly:

```html
<script src="https://unpkg.com/@drawboard/utils@0.1.0/dist/drawboard-utils.min.js"></script>
<script>
  // DrawboardUtils is a global variable defined by drawboard.min.js
  const { exportToSvg, exportToBlob } = DrawboardUtils;
</script>
```

Here's the `exportToBlob` and `exportToSvg` functions in action:

```js
const drawboardDiagram = {
  type: "drawboard",
  version: 2,
  source: "https://drawboard.com",
  elements: [
    {
      id: "vWrqOAfkind2qcm7LDAGZ",
      type: "ellipse",
      x: 414,
      y: 237,
      width: 214,
      height: 214,
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "#15aabf",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: 1041657908,
      version: 120,
      versionNonce: 1188004276,
      isDeleted: false,
      boundElementIds: null,
    },
  ],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: null,
  },
};

// Export the Drawboard diagram as SVG string
const svg = exportToSvg(drawboardDiagram);
console.log(svg.outerHTML);

// Export the Drawboard diagram as PNG Blob URL
(async () => {
  const blob = await exportToBlob({
    ...drawboardDiagram,
    mimeType: "image/png",
  });

  const urlCreator = window.URL || window.webkitURL;
  console.log(urlCreator.createObjectURL(blob));
})();
```
