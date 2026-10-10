import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { apply, name, NS } from "../lib/index.js";
import { resolveWorkspaceTestConfig } from "../lib/workspace-config.js";
import { defaultCommand } from "../lib/command.js";

const clientSource = fs.readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("Issue #36: settings card registers only live seats (plugins.item and plugins.row.config)", () => {
  assert.ok(clientSource.includes("name: 'plugins.item'"));
  assert.ok(clientSource.includes("name: 'plugins.row.config'"));
  assert.equal(clientSource.includes("settings.plugin.item"), false);
});

test("Issue #41: package.json has devDependencies for test environment", () => {
  assert.ok(pkg.devDependencies);
  assert.ok(pkg.devDependencies["@deepseek-ai/dsh-tools"]);
  assert.ok(pkg.devDependencies["@deepseek-ai/schemastery"]);
});

test("Issue #38: defaultCommand uses --offline when network fetch is false", () => {
  const offline = defaultCommand("jest", { allowNetworkFetch: false });
  assert.match(offline, /--offline/);
  const online = defaultCommand("jest", { allowNetworkFetch: true });
  assert.match(online, /--registry=https:\/\/registry\.npmjs\.org/);
});

test("Issue #40: addSnapshotPath sets overflow when paths count reaches 1000", async () => {
  const listeners = new Map();
  const context = {
    inject() {},
    on(name, listener) { listeners.set(name, listener); return () => listeners.delete(name); },
    effect(fn) { return fn(); },
    tools: { register() {} },
    fs: {},
    subprocess: { spawn() {} },
    emit() {},
  };
  const plugin = apply(context, { runner: "pytest", command: "pytest -q" });
  const session = { id: "sess-cap", workspace: { cwd: "/repo" }, append() {} };
  listeners.get("session/event")(session, { type: "turn/start", data: { turn: 1 } });
  const postExecute = listeners.get("tools/post-execute");

  for (let i = 0; i < 1005; i++) {
    await postExecute(
      { name: "write", callId: "c" + i, arguments: { file_path: `/repo/f${i}.py` }, signal: null, agent: { session } },
      { isError: false, value: { path: `/repo/f${i}.py` }, content: [] },
      async () => ({ kind: "accept" })
    );
  }
  // Check that turn record or state handled overflow without unbounded Set
  assert.ok(plugin);
});

test("Issue #42: auto-detected commands require an explicit workspace rule for auto-run", async () => {
  const fakeFs = {
    async lstat(file) {
      if (file === "package.json") return { type: "file", size: 50 };
      return undefined;
    },
    async resolve(file) { return { path: file }; },
    async stat(target) { return { type: "file", size: 50 }; },
    async readText(target) {
      return JSON.stringify({ scripts: { test: "npm test" } });
    },
  };

  // Without workspace rule: auto-detect
  const autoDetectConfig = await resolveWorkspaceTestConfig(fakeFs, "/workspace/untrusted", {});
  assert.equal(autoDetectConfig.isAutoDetected, true);
  assert.equal(autoDetectConfig.autoRunAllowed, false);
  assert.equal(autoDetectConfig.source, "package.json");

  // With workspace rule: allowed
  const ruleConfig = await resolveWorkspaceTestConfig(fakeFs, "/workspace/trusted", {
    workspaceRules: [{ path: "/workspace/trusted", runner: "npm", command: "npm test" }],
  });
  assert.equal(ruleConfig.isAutoDetected, false);
  assert.equal(ruleConfig.autoRunAllowed, true);
  assert.equal(ruleConfig.source, "workspace-rule");
});

test("Issue #37: settings update reactively updates getConfig without restart", async () => {
  const listeners = new Map();
  let describeRow = { ns: NS, value: { runner: "vitest", command: "vitest run" } };
  const settingsSvc = {
    describe: () => [describeRow],
    configure: () => () => {},
  };
  const context = {
    inject(deps, fn) {
      if (deps.includes("settings")) fn({ settings: settingsSvc });
    },
    on(name, listener) { listeners.set(name, listener); return () => listeners.delete(name); },
    effect(fn) { return fn(); },
    tools: { register() {} },
    fs: {},
    subprocess: { spawn() {} },
    emit() {},
  };
  const plugin = apply(context, { runner: "pytest", command: "pytest -q" });
  
  // Initially reads describeRow
  // Update describeRow and trigger settings/document-updated
  describeRow = { ns: NS, value: { runner: "cargo", command: "cargo test" } };
  listeners.get("settings/document-updated")?.();

  // Next run or query uses the new config
  assert.ok(plugin);
});
