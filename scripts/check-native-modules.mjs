#!/usr/bin/env node
/**
 * Run before `dev` and `build`, and after `install`.
 * Tries to load better-sqlite3. If the native binary's ABI doesn't match the
 * current Node version, automatically rebuilds it. This prevents the
 * "NODE_MODULE_VERSION mismatch" 500 errors after a Node upgrade.
 */

import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  require("better-sqlite3");
} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  if (/NODE_MODULE_VERSION/.test(msg) || err.code === "ERR_DLOPEN_FAILED") {
    console.warn(
      "\n[check-native-modules] better-sqlite3 ABI mismatch detected — rebuilding for Node " +
        process.version,
    );
    try {
      execSync("npm rebuild better-sqlite3", { stdio: "inherit" });
      console.log("[check-native-modules] rebuilt successfully\n");
    } catch (rebuildErr) {
      console.error(
        "[check-native-modules] rebuild failed. Run `npm rebuild better-sqlite3` manually.\n",
      );
      process.exit(1);
    }
  } else if (err.code === "MODULE_NOT_FOUND") {
    // Module not yet installed (e.g. CI before install) — let npm install handle it.
    process.exit(0);
  } else {
    // Some other failure — print but don't block, since prod servers shouldn't auto-rebuild.
    console.warn(
      "[check-native-modules] unexpected error (continuing):",
      msg.split("\n")[0],
    );
  }
}
