import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { MANIFEST_NAME, syncTemplates } from "../extensions/template-sync.mjs";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const roles = ["reviewer", "scout", "spec-explorer", "spec-merger", "spec-worker", "verifier", "worker"];

function temporaryDirectory(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "pi-herdr-orchestration-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fixturePackage(t) {
  const root = temporaryDirectory(t);
  mkdirSync(path.join(root, "herdr", "templates"), { recursive: true });
  writeFileSync(
    path.join(root, "herdr", "templates", "scout.md"),
    "---\nname: scout\ncommand: __PI_COMMAND__\n---\nVersion one\n",
  );
  return root;
}

test("installs all roles idempotently with the POSIX launcher", (t) => {
  const targetDir = path.join(temporaryDirectory(t), "templates");
  const first = syncTemplates({ packageRoot, targetDir, platform: "linux", env: {}, version: "0.1.0" });
  assert.equal(first.changed.length, 7);
  assert.equal(first.conflicts.length, 0);
  assert.deepEqual(first.results.map((result) => result.name), roles.map((role) => `${role}.md`).sort());
  assert.match(readFileSync(path.join(targetDir, "scout.md"), "utf8"), /command: fish -lic 'exec pi'/);

  const second = syncTemplates({ packageRoot, targetDir, platform: "linux", env: {}, version: "0.1.0" });
  assert.equal(second.changed.length, 0);
  assert.equal(second.results.filter((result) => result.status === "unchanged").length, 7);
  assert.ok(readFileSync(path.join(targetDir, MANIFEST_NAME), "utf8").includes('"0.1.0"'));
});

test("uses the Windows launcher and supports an explicit command override", (t) => {
  const targetDir = path.join(temporaryDirectory(t), "templates");
  syncTemplates({ packageRoot, targetDir, platform: "win32", env: {}, version: "0.1.0" });
  assert.match(readFileSync(path.join(targetDir, "worker.md"), "utf8"), /command: pi\n/);

  const overridden = path.join(temporaryDirectory(t), "templates");
  syncTemplates({
    packageRoot,
    targetDir: overridden,
    platform: "linux",
    env: { PI_HERDR_ORCHESTRATION_PI_COMMAND: "pi --thinking low" },
    version: "0.1.0",
  });
  assert.match(readFileSync(path.join(overridden, "worker.md"), "utf8"), /command: pi --thinking low/);
});

test("updates files only when their current content matches the previous package manifest", (t) => {
  const source = fixturePackage(t);
  const targetDir = path.join(temporaryDirectory(t), "templates");
  syncTemplates({ packageRoot: source, targetDir, platform: "linux", env: {}, version: "0.1.0" });
  writeFileSync(path.join(source, "herdr", "templates", "scout.md"), "---\nname: scout\ncommand: __PI_COMMAND__\n---\nVersion two\n");

  const report = syncTemplates({ packageRoot: source, targetDir, platform: "linux", env: {}, version: "0.2.0" });
  assert.deepEqual(report.changed.map((result) => result.status), ["updated"]);
  assert.match(readFileSync(path.join(targetDir, "scout.md"), "utf8"), /Version two/);
});

test("preserves locally modified or pre-existing conflicting templates", (t) => {
  const source = fixturePackage(t);
  const targetDir = path.join(temporaryDirectory(t), "templates");
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(path.join(targetDir, "scout.md"), "Local template\n");

  const report = syncTemplates({ packageRoot: source, targetDir, platform: "linux", env: {}, version: "0.1.0" });
  assert.equal(report.conflicts.length, 1);
  assert.equal(report.changed.length, 0);
  assert.equal(readFileSync(path.join(targetDir, "scout.md"), "utf8"), "Local template\n");
});
