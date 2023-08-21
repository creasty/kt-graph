#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");
process.env.KT_GRAPH_VERSION = version;

require("../dist/main.js");
