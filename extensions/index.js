import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncTemplates } from "./template-sync.mjs";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const { version } = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));

export default function herdrOrchestration(pi) {
  function sync(ctx, automatic) {
    try {
      const report = syncTemplates({ packageRoot, version });
      if (automatic && report.changed.length === 0 && report.conflicts.length === 0) return;

      const conflictNames = report.conflicts.map((result) => result.name).join(", ");
      const detail = conflictNames ? `; preserved conflicting files: ${conflictNames}` : "";
      const message = `Herdr orchestration: ${report.changed.length} template(s) installed or updated, ${report.conflicts.length} conflict(s)${detail}. Location: ${report.targetDir}`;
      ctx.ui.notify(message, report.conflicts.length > 0 ? "warning" : "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.ui.notify(`Herdr orchestration template sync failed: ${message}`, "error");
    }
  }

  pi.registerCommand("herdr-orchestration-templates", {
    description: "Install or update package-owned Herdr orchestration role templates",
    handler: async (_args, ctx) => sync(ctx, false),
  });

  pi.on("session_start", (_event, ctx) => {
    if (process.env.HC_TERMINAL_ID) sync(ctx, true);
  });
}
