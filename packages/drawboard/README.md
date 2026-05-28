# Drawboard

**Drawboard** is exported as a component to be directly embedded in your project.

## Installation

Use `npm` or `yarn` to install the package.

```bash
npm install react react-dom @drawboard/drawboard
# or
yarn add react react-dom @drawboard/drawboard
```

> **Note**: If you don't want to wait for the next stable release and try out the unreleased changes, use `@drawboard/drawboard@next`.

#### Self-hosting fonts

By default, Drawboard will try to download all the used fonts from the [CDN](https://esm.run/@drawboard/drawboard/dist/prod).

For self-hosting purposes, you'll have to copy the content of the folder `node_modules/@drawboard/drawboard/dist/prod/fonts` to the path where your assets should be served from (i.e. `public/` directory in your project). In that case, you should also set `window.DRAWBOARD_ASSET_PATH` to the very same path, i.e. `/` in case it's in the root:

```js
<script>window.DRAWBOARD_ASSET_PATH = "/";</script>
```

### Dimensions of Drawboard

Drawboard takes _100%_ of `width` and `height` of the containing block so make sure the container in which you render Drawboard has non zero dimensions.

## Demo

Go to [CodeSandbox](https://codesandbox.io/p/sandbox/github/drawboard/drawboard/tree/master/examples/with-script-in-browser) example.

## Integration

Head over to the [docs](https://docs.drawboard.com/docs/@drawboard/drawboard/integration).

## API

Head over to the [docs](https://docs.drawboard.com/docs/@drawboard/drawboard/api).

## Contributing

Head over to the [docs](https://docs.drawboard.com/docs/@drawboard/drawboard/contributing).
