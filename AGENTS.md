# Repository guidance

Read [README.md](README.md) for the source-consumption and playground workflow. [BlazorReteJs/AGENTS.md](BlazorReteJs/AGENTS.md) governs the Blazor/C#/TypeScript bridge; keep Rete v2 contracts, DTO alignment, consumer-owned validation, and lifecycle/disposal intact. `ReteTypescript/` contains separate reference/test applications, not the canonical bridge build root.

The current project/solution and `BlazorReteJs/package.json` define framework and build commands. Do not upgrade frameworks or dependencies merely because their versions are old. Generated JS lives in `BlazorReteJs/wwwroot/js`; change TypeScript inputs, not generated bundles. The imported frontend MSBuild targets may install/build npm inputs, so a .NET build is not a text-only check.

For documentation-only maintenance, check facts, local links, and the diff, disclose unrun code/browser checks, and preserve existing implementation gates. Do not run formatters that rewrite files or launch playgrounds merely to validate prose.

## Independent architecture and review

Start each delegated architect, advisor, and reviewer with empty conversation context (`fork_turns="none"` with `spawn_agent`, or the host's equivalent). Provide only the concrete question, repository path and relevant revisions, scope, constraints, and raw evidence locations. Keep the brief focused on the actual topic; omit the author's reasoning, preferred verdict, and earlier agents' conclusions.

Each agent independently inspects the relevant code, contracts, and tests and reports its own evidence, conclusions, and uncertainty. The final reviewer must be separate from the implementer and design advisor, remain read-only, and inspect the final diff at the named revision. Disclose unavailable independent review rather than presenting self-review as independent.
