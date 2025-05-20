import assert from "node:assert";
import * as pkg from "use-magic-props";

globalThis.console.log(pkg.welcome());

assert.strictEqual(pkg.welcome(), "hello world");
