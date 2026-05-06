# BlazorReteJs API Notes

This document is a routing map for the generic bridge API. Source code remains
the source of truth.

## C# Surface

`BlazorReteEditor<TNode>` exposes the main editor operations:

- lifecycle: `WhenLoaded`
- editor flags: `BackgroundEnabled`, `Readonly`
- viewport and pointer geometry: `GetViewportBounds`, `GetClientBounds`,
  `GetMousePositionInViewport`
- graph reads: `GetNodes`, `GetNodesCache`, `GetConnections`,
  `GetConnectionsCache`, `GetNode`
- node edits: `AddNode`, `AddNodes`, `UpdateNodes`, `RemoveNode`, `Clear`
- connection edits: `AddConnection`, `AddConnections`, `UpdateConnection`,
  `RemoveConnection`
- selection: `GetSelectedNodes`, `SetSelectedNodes`, `SelectNode`,
  `DeselectNode`, `ClearSelectedNodes`
- layout: `ArrangeNodes`, `ZoomAtNodes`
- dock templates: `AddDockTemplate`, `WhenTemplateCreated`
- position stream: `NodePositionUpdates`

`ReteEditorFacade.cs` is the C# JS-object wrapper used by
`BlazorReteEditor<TNode>`. It should stay thin and map directly to TypeScript
facade methods.

## DTOs

`ReteNodeParams` currently contains:

- `label`
- `id`
- `maxInputs`
- `maxOutputs`
- `x`
- `y`
- `width`
- `height`
- `autoSize`
- `extraParams`
- `blazorHost`

`ReteConnectionParams` currently contains:

- `id`
- `sourceNodeId`
- `sourcePinId`
- `targetNodeId`
- `targetPinId`
- `family`
- `order`

`ReteConnection` currently exposes JS fields:

- `Id`
- `Source`
- `Target`
- `SourcePinId`
- `TargetPinId`
- `IsActive`

If a field is added to TypeScript DTOs, add the corresponding C# field and
update this file.

## TypeScript Surface

Important files:

- `rete-editor-shared.tsx`: shared types, `ReteNode`, `ReteConnection`, schemes.
- `rete-editor-factory.tsx`: `renderEditor`, `createEditor`, editor registry.
- `rete-editor-facade.tsx`: graph operations and plugin setup.
- `rete-editor-listener.tsx`: Rete event streams exposed as observable
  collections.
- `rete-custom-node-component.tsx`: React node renderer and Blazor host slot.
- `rete-custom-socket-component.tsx`: current generic socket renderer.
- `magnetic-connection/index.ts`: custom nearest-socket connection UX.
- `dock/index.ts`: async dock plugin.

Current Rete packages:

- `rete`
- `rete-area-plugin`
- `rete-connection-plugin`
- `rete-react-plugin`
- `rete-readonly-plugin`
- `rete-auto-arrange-plugin`
- `rete-connection-path-plugin`
- `rete-render-utils`

## Build And Test

From `Sources/BlazorReteJs`:

```powershell
npm test
npm run build
```

From repo root:

```powershell
dotnet build Sources\BlazorReteJs\BlazorReteJs.csproj
```

The TypeScript build bundles `wwwroot/ts/*.ts*` to `wwwroot/js` as ES modules.
