# BlazorReteJs Agent Notes

These instructions apply to `Sources/BlazorReteJs`.

## Required Context

Before changing the Blazor/Rete bridge, read:

- [docs/retejs-ai-brief.md](docs/retejs-ai-brief.md)
- [docs/retejs-concepts.md](docs/retejs-concepts.md)
- [docs/retejs-api-recipes.md](docs/retejs-api-recipes.md)
- [docs/blazor-retejs-technical-design.md](docs/blazor-retejs-technical-design.md)
- [docs/blazor-retejs-api.md](docs/blazor-retejs-api.md)

## Rete Version And Model

This package uses Rete.js v2 packages. Do not use Rete v1 examples or APIs.

Rete is a TypeScript graph editor toolkit. In this project, Rete renders through
React inside a Blazor component, while C# owns application DTOs, hosted Blazor
node content, and consumer-side validation.

## C# And TypeScript Coupling

Keep C# DTOs and TypeScript interfaces aligned:

- `Api/ReteNodeParams.cs` ↔ `wwwroot/ts/rete-editor-shared.tsx` `ReteNodeParams`
- `Api/ReteConnectionParams.cs` ↔ `ReteNodeConnectionParams`
- `Api/ReteConnection.cs` ↔ TypeScript `ReteConnection`

When adding fields, update both sides and the docs in this folder. Prefer stable
string ids for storage/interoperability and let hot runtime code compile them to
compact handles elsewhere.

## Build And Test

For C# changes, use the normal project build:

```powershell
dotnet build BlazorReteJs\BlazorReteJs.csproj
```

For TypeScript changes, use the package scripts from this directory:

```powershell
npm test
npm run build
```

Do not run formatters that rewrite files unless the user asks for formatting.

## Integration Rules

- BlazorReteJs is a generic bridge. Keep application-specific graph validation
  in consumer adapters.
- Client-side Rete compatibility feedback is advisory. Authoritative graph
  validation remains in C# consumers.
- Rete import/export is app-owned. Do not assume Rete provides a complete
  persistence format.
- Preserve Blazor host lifecycle and JS object disposal paths when changing node
  rendering or editor initialization.
