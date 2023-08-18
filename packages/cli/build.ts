/* eslint-disable @typescript-eslint/no-var-requires */
const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("./package.json");

const shared = {
  entryPoints: ["src/index.ts"],
  external: [...Object.keys(dependencies ?? {}), ...Object.keys(peerDependencies ?? {})],
  bundle: true,
  minify: true,
  sourcemap: true,
  logLevel: "info",
};

build({
  ...shared,
  format: "cjs",
  outfile: "dist/main.js",
  target: ["ES6"],
  platform: "node",
});
