# pi-herdr-orchestration

A Pi package that adapts skill-owned coding workflows to fresh, observable Herdr Core subagents. It is designed for Matt Pocock's skills but does not replace them.

## Responsibilities

- The active skill owns its workflow, artifacts, Git and tracker behavior, verification, and closeout.
- `herdr-orchestration` maps that workflow to fresh subagents, context pointers, concurrency barriers, and evidence handoffs.
- `herdr-core` owns the underlying `hc` terminal lifecycle, messaging, waiting, recovery, and safety rules.

The adapter does not assume a project layout. It supports a single repository, sibling worktrees, several independent repositories, and optional manifest-driven workspaces.

## Requirements

- Pi 1.6 or newer
- Node.js 22.19 or newer
- Herdr Core with `hc` on `PATH`
- An interactive Pi session inside a Herdr Core terminal for automatic template synchronization
- Matt Pocock skills installed where the calling agent can read them

On POSIX systems, role templates default to `fish -lic 'exec pi'` so a login Fish shell can configure mise-managed tools. On Windows, the default is `pi`. Set `PI_HERDR_ORCHESTRATION_PI_COMMAND` to override the launch command.

## Install

```bash
pi install git:github.com/brutaldeluxe82/pi-herdr-orchestration
```

Start or reload Pi inside Herdr Core. The package loads the `herdr-orchestration` skill and `/orchestrate` prompt. While `HC_TERMINAL_ID` is present, its extension also installs or updates package-owned templates in Herdr's template directory.

To synchronize templates explicitly:

```text
/herdr-orchestration-templates
```

The synchronizer never overwrites a conflicting pre-existing or locally edited template. It reports conflicts and leaves those files unchanged. It does not delete removed or obsolete templates during upgrades or package removal.

## Use

Invoke the global skill directly:

```text
/skill:herdr-orchestration implement-spec /path/to/spec.md
```

Or use the prompt shorthand:

```text
/orchestrate implement-spec /path/to/spec.md
/orchestrate implement /path/to/ticket.md
/orchestrate code-review HEAD against main using /path/to/spec.md
/orchestrate research the current OAuth token-exchange requirements from primary sources
```

Matt's skills remain the source of workflow truth. For example, `implement-spec` supplies the ticket graph and integration process; this package supplies fresh implementer and merger terminals, progress visibility, and result delivery through Herdr.

## Role adapters

| Skill responsibility | Herdr template |
|---|---|
| Read-only exploration | `scout` |
| Research and exploration artifacts | `spec-explorer` |
| `implement`, `tdd`, and related implementation work | `worker` |
| One `implement-spec` implementer ticket | `spec-worker` |
| One `implement-spec` merger | `spec-merger` |
| One `code-review` Standards or Spec axis | `reviewer` |
| Independent acceptance and evidence checks | `verifier` |

## Update and remove

Update this package through Pi, then run `/reload` in open sessions or start a new one:

```bash
pi update git:github.com/brutaldeluxe82/pi-herdr-orchestration
```

To uninstall:

```bash
pi remove git:github.com/brutaldeluxe82/pi-herdr-orchestration
```

Pi's resources are removed by Pi. Herdr template files remain because Pi has no package-uninstall hook; they can be removed manually from `~/.config/herdr-core/templates` on POSIX or `%APPDATA%/herdr-core/templates` on Windows. The `pi-herdr-orchestration.json` manifest records package-managed content and upgrade ownership.

## Security

Pi packages and Herdr child agents run with your user permissions. Role instructions are behavioral boundaries, not a sandbox. Review package code and use operating-system or container isolation for untrusted work.

## Development

```bash
npm test
npm run check
```

## License

MIT
