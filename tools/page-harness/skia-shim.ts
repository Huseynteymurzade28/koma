// Lets app drawing code (which imports '@shopify/react-native-skia') run in Node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const headless = require('@shopify/react-native-skia/lib/commonjs/headless');
module.exports = {
  ...headless,
  Skia: new Proxy({}, { get: (_t, k) => headless.getSkiaExports().Skia[k] }),
};
