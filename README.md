# Blazor.Rete.js

Blazor.Rete.js is a Blazor wrapper around [Rete.js v2](https://retejs.org/).
It renders a Rete/React graph editor inside a Blazor component while exposing
C# APIs for nodes, connections, selection, layout, dock templates, hosted Blazor
node content, and editor events.

This repository is open source, but the library is not currently published as a
NuGet package. Use it as a source dependency, a Git submodule, or build/package
it locally for your application.

## What Is Included

- `BlazorReteJs`: Razor Class Library with the Blazor component, C# DTOs, JS
  interop wrappers, React/Rete TypeScript source, styles, and static web assets.
- `BlazorReteJs.Playground`: shared playground UI.
- `BlazorReteJs.Playground.Web`: Blazor Server playground host.
- `BlazorReteJs.Playground.WebAssembly`: Blazor WebAssembly playground host.
- `BlazorReteJs/docs`: implementation notes for maintainers and AI agents.

The current target framework is `net7.0`.

## Prerequisites

- .NET SDK 7 or newer
- Node.js and npm
- A Blazor Server or Blazor WebAssembly app

## Build From Source

The TypeScript bundle is generated locally and emitted into
`BlazorReteJs/wwwroot/js`.

```powershell
cd BlazorReteJs
npm install
npm run build
cd ..
dotnet build BlazorReteJs.sln
```

The repository `.gitignore` excludes generated JS output and `node_modules`.
Run `npm run build` after changing TypeScript or after a fresh clone.

## Run The Playground

Blazor Server:

```powershell
dotnet run --project BlazorReteJs.Playground.Web
```

Blazor WebAssembly:

```powershell
dotnet run --project BlazorReteJs.Playground.WebAssembly
```

Open the URL printed by `dotnet run`. The playground demonstrates adding nodes,
arranging nodes, zooming, dock templates, selection, node movement streams, and
connection streams.

## Use In Your App

Because there is no published NuGet package yet, reference the project directly:

```xml
<ItemGroup>
  <ProjectReference Include="path\to\Blazor.Rete.js\BlazorReteJs\BlazorReteJs.csproj" />
</ItemGroup>
```

Register services and the custom element used to host Blazor node content.

Blazor Server:

```csharp
using BlazorReteJs.Scaffolding;

services.AddServerSideBlazor(options =>
{
    options.RootComponents.AddBlazorReteJs();
});
services.AddBlazorReteJs();
```

Blazor WebAssembly:

```csharp
using BlazorReteJs.Scaffolding;

builder.RootComponents.AddBlazorReteJs();
builder.Services.AddBlazorReteJs();
```

Add the editor to a Razor component:

```razor
@using BlazorReteJs
@using BlazorReteJs.Api

<BlazorReteEditor @ref="editor" TNode="MyNodeModel">
    <NodeTemplate>
        <div class="my-node">
            @context.Id
        </div>
    </NodeTemplate>
</BlazorReteEditor>

@code {
    private BlazorReteEditor<MyNodeModel>? editor;

    private async Task AddNode()
    {
        if (editor == null)
        {
            return;
        }

        await editor.AddNode(new ReteNodeParams
        {
            Label = "Node",
            MaxInputs = 1,
            MaxOutputs = 1,
            ExtraParams = new MyNodeModel()
        });
    }

    private sealed class MyNodeModel
    {
    }
}
```

The editor imports its static assets from `_content/BlazorReteJs/...`.

## Core C# API

`BlazorReteEditor<TNode>` exposes the main operations:

- add, update, remove, and clear nodes
- add, update, and remove connections
- read node and connection caches
- read and set selection
- arrange nodes and zoom to nodes
- read viewport and mouse positions
- add dock templates
- subscribe to node position, selection, node, and connection changes

Important DTOs live in `BlazorReteJs.Api`:

- `ReteNodeParams`
- `ReteConnectionParams`
- `ReteNode`
- `ReteConnection`
- `RetePoint`
- `ReteRectangle`

## TypeScript Development

Rete/React source lives under `BlazorReteJs/wwwroot/ts`.

Useful commands from `BlazorReteJs`:

```powershell
npm test
npm run build
```

`npm run build` uses esbuild to bundle all `wwwroot/ts/*.ts*` entrypoints into
ES modules under `wwwroot/js`.

## Documentation

Start with:

- `BlazorReteJs/docs/README.md`
- `BlazorReteJs/docs/retejs-ai-brief.md`
- `BlazorReteJs/docs/retejs-concepts.md`
- `BlazorReteJs/docs/retejs-api-recipes.md`
- `BlazorReteJs/docs/blazor-retejs-technical-design.md`
- `BlazorReteJs/docs/blazor-retejs-api.md`

Those docs describe the bridge architecture, upstream Rete.js API patterns, and
current extension points.

## Project Status

This is a source-built Blazor/Rete bridge. Public API shape and packaging may
change. Consumers should pin a commit or submodule revision and validate their
own editor workflows when upgrading.

## License

MIT. See `LICENSE`.
