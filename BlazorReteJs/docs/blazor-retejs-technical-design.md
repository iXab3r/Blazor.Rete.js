# BlazorReteJs Technical Design

BlazorReteJs is a generic bridge between Blazor/C# and Rete.js v2. Rete and
React own the canvas. C# owns application DTOs, hosted Blazor node bodies, and
consumer-specific validation.

## Architecture

The public Blazor component is `BlazorReteEditor<TNode>`. It imports the bundled
ES modules, calls TypeScript `renderEditor`, wraps the returned
`ReteEditorFacade`, and exposes async C# operations for nodes, connections,
selection, viewport geometry, dock templates, and node position updates.

The TypeScript entrypoint is `rete-editor-factory.tsx`:

- `renderEditor(container)` creates a React `ReteComponent` and retrieves the
  editor facade.
- `createEditor(container)` creates `ReteEditorFacade`, selection handling, and
  area panning behavior.
- Editors are tracked by DOM container id.

`ReteEditorFacade` owns the Rete graph and plugins:

- `NodeEditor<Schemes>`
- `AreaPlugin`
- `ConnectionPlugin`
- `ReactPlugin`
- `ReadonlyPlugin`
- `AutoArrangePlugin`
- `ConnectionPathPlugin`
- custom `AsyncDockPlugin`
- custom selection, magnetic connection, and event listener helpers

The current renderer uses `rete-react-plugin` classic presets with custom React
components:

- `ReteCustomNodeComponent`
- `ReteCustomSocketComponent`
- `ReteCustomConnectionComponent`
- `MagneticConnection`

Blazor node content is hosted inside the React node by `BlazorFacade` and
`ReteNodeHostTemplateHook<TNode>`.

## Data Flow

C# sends `ReteNodeParams` and `ReteConnectionParams` through JS interop.
TypeScript maps them to `ReteNode` and `ReteConnection` instances.

Rete emits node/connection/selection/position events. `ReteEditorListener`
collects those into `RxObservableCollection` instances exposed back to C# through
observable JS interop. Node movement is buffered because Rete can generate many
drag events.

Current connection payloads already include canonical graph fields:

- `id`
- `sourceNodeId`
- `sourcePinId`
- `targetNodeId`
- `targetPinId`
- `family`
- `order`

The current node renderer still creates a single route input and output from
`maxInputs`/`maxOutputs`, using fixed pin ids `route-in` and `route-out`.

## Current Limitations

- `ReteNodeParams` has no explicit pin collection yet.
- `ReteNode` creates only one input socket and one output socket.
- `maxInputs > 1` and `maxOutputs > 1` make the single socket accept multiple
  connections rather than creating named pins.
- `ReteCustomNodeComponent` renders inputs at the top and outputs at the bottom.
- `ReteCustomSocketComponent` is a round generic socket with only the socket name
  in the title.
- Magnetic connection compatibility currently checks only opposite sides.
- TypeScript `ReteConnection` does not persist `family` or `order` on the
  connection object, even though creation params include them.
- `BlazorReteEditor.DisposeAsync` disposes Blazor hooks but the code still notes
  missing full Rete resource disposal.
- Import/export remains app-owned; this package exposes graph operations but
  does not define a persistence format.

## Extension Rules

- Keep DTOs synchronized between C# and TypeScript.
- Prefer additive DTO fields and preserve existing route-only fallback behavior.
- Keep BlazorReteJs generic. Application-specific graph validation belongs in
  consumer adapter code.
- Keep consumer implementation plans in their owning projects, and keep this
  folder focused on the generic bridge.
- Treat client compatibility feedback as advisory. Consumers remain
  authoritative.
- Call `area.update('node', node.id)` after changing dynamic node ports or
  rendered pin metadata.
- Keep event streams buffered where high-frequency events would flood C#.
- Preserve hosted Blazor component lifecycle when changing React node rendering.
