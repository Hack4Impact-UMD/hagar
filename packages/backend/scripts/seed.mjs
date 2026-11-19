import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
// Kept in `node_modules` so it is ignored by git and never reaches the
// deployed bundle in `dist`, while still resolving `firebase-admin` from here.
const outfile = join(packageRoot, "node_modules/.cache/seed/run.mjs");

// The seed code uses the workspace's path aliases, which Node doesn't read, so
// it is bundled first.
await esbuild.build({
  entryPoints: [join(packageRoot, "src/seed/run.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["firebase-admin"],
  logLevel: "warning",
  // Some bundled CommonJS dependencies call `require`, which does not exist in
  // an ES module.
  banner: {
    js: [
      'import { createRequire as __createRequire } from "node:module";',
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
});

const result = spawnSync(
  process.execPath,
  [outfile, ...process.argv.slice(2)],
  {
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
