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
`maxInputs`/`maxOutputs`, using fixed pin ids `route-in` and `route-out`, when
callers do not provide explicit `pins`.

## Typed Pin Rendering

`ReteNodeParams.pins` is optional for backward compatibility. If absent,
`ReteNode` creates the legacy route input/output sockets from `maxInputs` and
`maxOutputs`. If present, each pin becomes a Rete port keyed by `pin.id`, with
pin metadata carried by the socket instance for rendering and local advisory
compatibility.

The generic renderer exposes stable socket data attributes:

- `data-pin-id`
- `data-pin-family`
- `data-pin-direction`
- `data-value-type-id`

Socket titles use `pin.tooltip`, falling back to `description`, `name`, and
then `id`. Magnetic connection feedback uses local metadata only and remains
advisory; consumer validation remains authoritative.

Connection gestures use a click-to-arm bidirectional Rete flow so users can
start wiring from either an output or an input without holding the mouse button
down. Clicking a compatible socket creates the same `ReteConnection` runtime
object as magnetic drops so `family` and `order` metadata stay on the generic
connection path. While armed, the editor shows a small generic label fixed at
the editor top-left. The label uses node display name plus pin display name,
and may use a subtle progress affordance without blocking canvas interaction.
Family ids, value type ids, and stable pin codes remain tooltip/data-attribute
metadata unless no display name exists. Escape, right-click, an empty-board
click, or window focus loss cancels the pending gesture; empty-board drags can
still pan the area while the socket remains armed.

Dragging or arming over sockets marks compatible pins, dims incompatible pins,
reveals compatible advanced pins, and marks ordinary occupied inputs as
replacement candidates without removing existing connections. Connected
advanced pins stay visible through generic connection-state classes. Replacement
storage, validation, and undo history stay with the consumer. Same-node
output-to-input connections are invalid for current consumers; the bridge may
avoid presenting them as compatible, but consumer validation remains
authoritative.

Concealed advanced pins are hidden and non-interactable at both the rendered
socket and Rete socket wrapper. The bridge stamps `data-pin-hidden` and
`aria-hidden` while a pin is concealed, applies `pointer-events: none`, and the
connection flow refuses concealed sockets even if a caller reaches the socket
data programmatically. Only compatible armed gestures reveal unconnected
advanced pins; connected pins remain visible because connection-state metadata
comes from the graph, not transient drag state.

Pins may carry `pinRole` and `flowState` metadata. The generic renderer exposes
those values through `data-pin-role` and `data-pin-flow` and applies CSS classes
such as `pin-role-condition`, `pin-flow-cached`, and `pin-flow-evaluating`.
This supports role icons and lightweight value-flow animation without
per-frame Blazor updates.

Dropping a wire on a node body auto-connects only when exactly one compatible
socket pair exists on that node. When multiple compatible pairs exist, the area
container raises a generic cancelable `rete-pin-pair-picker` event and, unless a
host prevents the default event, renders a small generic picker near the drop
point. Picker rows use source -> target pin names and expose stable node/pin ids
through titles and data attributes. Selecting a row creates the same canonical
connection payload as a direct socket drop. Pending picker requests are canceled
through `rete-pin-pair-picker-cancel` when Escape/outside cancel, a new gesture,
clear, node removal, or socket unmount closes the request. Drops with no
compatible pairs raise the same event reason without creating a connection.
Picker rows show node/pin display names and include preview value plus
last-change time when the pin metadata provides it.

Nodes with more than one value-family output render those value outputs through
a compact generic launcher. The node still keeps each output as a real Rete
output keyed by the stable pin id; the renderer stacks those output sockets at
the launcher anchor so existing connections and new gestures continue to use the
logical source pin id. Route outputs and single value outputs keep the explicit
socket rendering.

The launcher defaults to the output marked `isPrimary`, or otherwise the first
value output by launcher menu order. Right-click opens a compact generic menu of
value outputs ordered by `menuOrder`, with advanced outputs deferred after
ordinary outputs. Menu rows expose stable pin ids, pin names, type metadata, and
primary/advanced markers through titles and data attributes. Selecting a row, or
pressing number keys 1-9 while the menu is open, arms that real output socket
for the next connection gesture through the same generic flow.
Menu rows should prefer display names and show preview value plus last-change
time when that metadata exists.

## Current Limitations

- Sliding anchors are deferred; socket placement is deterministic from pin side
  metadata and defaults.
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
