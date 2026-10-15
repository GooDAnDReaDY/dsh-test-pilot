import assert from "node:assert/strict";
import { test } from "node:test";
import { apply, NS } from "../lib/index.js";

test("Issue #45: NS matches profile entry id 'dsh-test-pilot'", () => {
  assert.equal(NS, "dsh-test-pilot");
});

test("Issue #45: describe?.().find safely handles describe returning null or missing find", () => {
  let capturedConfig;
  const fakeSettings = {
    describe() { return null; },
    configure() { return () => {}; },
  };
  const context = {
    inject(deps, fn) {
      if (deps.includes("settings")) fn({ settings: fakeSettings });
    },
    on() {},
    effect(fn) { return fn(); },
  };
  // apply should not throw when reading live config with describe() returning null
  assert.doesNotThrow(() => {
    apply(context, { runner: "default-runner" });
  });
});

test("Issue #45: configure() re-entry does not throw and executes once", () => {
  let configureCalls = 0;
  const fakeSettings = {
    describe() { return [{ ns: NS, value: { runner: "custom" } }]; },
    configure() {
      configureCalls++;
      if (configureCalls > 1) throw new Error("re-entry error");
    },
  };
  let settingsCallback;
  const context = {
    inject(deps, fn) {
      if (deps.includes("settings")) settingsCallback = fn;
    },
    on() {},
    effect(fn) { return fn(); },
  };
  apply(context, {});
  // First invocation
  settingsCallback({ settings: fakeSettings });
  assert.equal(configureCalls, 1);
  // Re-entry invocation
  assert.doesNotThrow(() => {
    settingsCallback({ settings: fakeSettings });
  });
  assert.equal(configureCalls, 1);
});
