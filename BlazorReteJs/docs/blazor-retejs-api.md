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
- `pins`
- `x`
- `y`
- `width`
- `height`
- `autoSize`
- `extraParams`
- `blazorHost`

`RetePinParams` is the generic typed-pin transport DTO. It contains:

- `id`
- `name`
- `family`
- `direction`
- `side`
- `valueTypeId`
- `maxConnections`
- `description`
- `tooltip`
- `isPrimary`
- `isAdvanced`
- `menuOrder`
- `coordinateTypeId`
- `compatibleValueTypeIds`
- `previewValue`
- `previewText`
- `previewChangedAt`
- `isEvaluating`
- `flowState`
- `pinRole`

When `pins` is absent, TypeScript preserves the legacy `maxInputs` and
`maxOutputs` fallback by creating `route-in` and `route-out` sockets. When
`pins` is present, each pin becomes a real Rete input or output keyed by the
stable pin id.

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
- `Family`
- `Order`
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

Typed-pin connection UX exposes these generic DOM events from the Rete area
container:

- `rete-pin-pair-picker`: raised after a node-body drop when there is not
  exactly one compatible socket pair. The detail contains `requestId`,
  `initialNodeId`, `initialPinId`, `targetNodeIds`, `reason`, pointer
  `position`, and named candidate pairs with source/target node and pin ids.
  The event is cancelable; hosts can call `preventDefault()` to replace the
  built-in generic picker for ambiguous drops.
- `rete-pin-pair-picker-cancel`: raised when transient drag state or a pending
  picker request is canceled by Escape/outside cancel, a new gesture, board
  clear, node removal, or socket unmount.

The bridge uses local pin metadata for compatibility hints, auto-connect
decisions, and the default ambiguous node-body picker. Picker rows use generic
source -> target pin names, with stable node/pin ids in titles and data
attributes, and include preview value plus last-change time when that metadata
exists. Same-node output-to-input pairs are rejected by the generic advisory
compatibility layer. Consumer validation, persistence, replacement policy, and
undo history remain application-owned.

Advanced pins that are not connected, picked, compatible, or nearest are
explicitly marked hidden through `data-pin-hidden`/`aria-hidden` on socket DOM
wrappers and are ignored by connection gestures. Connected advanced pins stay
visible because connection state is reflected from the Rete graph. Consumers can
also project `pinRole` and `flowState` for CSS-only role icons and lightweight
value-flow animation; the bridge renders them as stable `data-pin-role` and
`data-pin-flow` attributes without running animation loops.

Connection gestures are click-to-arm: a left click on a socket or launcher
socket arms it, a later compatible socket click creates the connection, and
Escape, right-click, empty-board click, or focus loss cancels the pending
gesture. While armed, a small generic label fixed at the editor top-left
displays the selected endpoint using node display name plus pin display name.
The label may show a subtle non-blocking progress affordance.
Family ids, value type ids, and stable pin codes stay in tooltips/data
attributes unless display metadata is missing. Dragging empty board space
remains available for panning while a socket is armed. Clicking an occupied
input detaches through `editor.removeConnection`, so BlazorReteJs emits the
normal generic connection removal event stream.

For nodes with multiple value-family outputs, the generic node renderer shows a
compact output launcher instead of a permanent separate socket cluster. Each
value output remains a real Rete output keyed by its stable pin id. The launcher
uses `isPrimary` for the default output when present, falls back to menu/list
order, and exposes a right-click menu ordered by `menuOrder` with `isAdvanced`
entries deferred after ordinary entries. Menu rows and the launcher expose pin
ids, names, type metadata, and optional preview/change-time metadata through
data attributes. Selecting a row, or
pressing number keys 1-9 while the launcher menu is open, arms the selected
real output pin id for the next connection gesture.

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
