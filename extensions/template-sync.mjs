import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export const MANIFEST_NAME = "pi-herdr-orchestration.json";

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function atomicWrite(file, content) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, content, "utf8");
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function loadManifest(file) {
  if (!existsSync(file)) return { files: {} };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return typeof parsed.files === "object" && parsed.files !== null ? parsed : { files: {} };
  } catch {
    return { files: {} };
  }
}

export function resolveTemplateDir(env = process.env, platform = process.platform) {
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(homedir(), "AppData", "Roaming"), "herdr-core", "templates");
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "herdr-core", "templates");
}

export function piCommand(env = process.env, platform = process.platform) {
  return env.PI_HERDR_ORCHESTRATION_PI_COMMAND || (platform === "win32" ? "pi" : "fish -lic 'exec pi'");
}

export function syncTemplates({ packageRoot, targetDir, env = process.env, platform = process.platform, version = "0.0.0" }) {
  const sourceDir = path.join(packageRoot, "herdr", "templates");
  const destination = targetDir || resolveTemplateDir(env, platform);
  const manifestPath = path.join(destination, MANIFEST_NAME);
  const previous = loadManifest(manifestPath);
  const command = piCommand(env, platform);
  const names = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  mkdirSync(destination, { recursive: true });
  const results = [];
  const nextFiles = {};

  for (const name of names) {
    const desired = readFileSync(path.join(sourceDir, name), "utf8").replace("__PI_COMMAND__", command);
    const file = path.join(destination, name);
    const previousHash = previous.files[name];
    const current = existsSync(file) ? readFileSync(file, "utf8") : null;

    if (current === desired) {
      results.push({ name, status: "unchanged" });
      nextFiles[name] = hash(desired);
      continue;
    }

    if (current !== null && hash(current) !== previousHash) {
      results.push({ name, status: "conflict" });
      continue;
    }

    atomicWrite(file, desired);
    nextFiles[name] = hash(desired);
    results.push({ name, status: current === null ? "installed" : "updated" });
  }

  const manifest = `${JSON.stringify({ version, files: nextFiles }, null, 2)}\n`;
  const currentManifest = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : null;
  if (manifest !== currentManifest) atomicWrite(manifestPath, manifest);

  return {
    targetDir: destination,
    results,
    changed: results.filter((result) => result.status === "installed" || result.status === "updated"),
    conflicts: results.filter((result) => result.status === "conflict"),
  };
}
