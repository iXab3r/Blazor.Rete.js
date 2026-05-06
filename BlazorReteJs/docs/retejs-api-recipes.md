# Rete.js API Recipes And Practices

This document is a compact working guide for Rete.js v2 APIs used by the
generic BlazorReteJs bridge. Source code remains the source of truth, and
upstream Rete docs/examples remain the reference for package behavior.
Read [retejs-concepts.md](retejs-concepts.md) first when designing larger
extensions.

## Upstream References

- Basic editor: <https://retejs.org/docs/guides/basic/>
- Connections: <https://retejs.org/docs/guides/connections/>
- Validation: <https://retejs.org/docs/guides/validation/>
- Import/export: <https://retejs.org/docs/guides/import-export/>
- Undo/Redo: <https://retejs.org/docs/guides/undo-redo/>
- Performance: <https://retejs.org/docs/best-practices/performance/>
- Magnetic connection example: <https://retejs.org/examples/magnetic-connection/>

## Bootstrap Recipe

Use Rete v2 concepts only. Do not copy Rete v1 examples.

The usual editor stack is:

```ts
import { NodeEditor, ClassicPreset, GetSchemes } from "rete";
import { AreaPlugin } from "rete-area-plugin";
import { ConnectionPlugin, Presets as ConnectionPresets } from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
type AreaExtra = ReactArea2D<Schemes>;

const editor = new NodeEditor<Schemes>();
const area = new AreaPlugin<Schemes, AreaExtra>(container);
const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });
const connection = new ConnectionPlugin<Schemes, AreaExtra>();

render.addPreset(Presets.classic.setup());
connection.addPreset(ConnectionPresets.classic.setup());

editor.use(area);
area.use(render);
area.use(connection);
```

Most Rete editor operations are async. Await node and connection mutations in
facade methods so Blazor sees a stable state after each operation.

## Nodes, Ports, And Controls

`ClassicPreset.Node`, `Input`, `Output`, `Socket`, `Control`, and
`InputControl` are the common starter types.

Typical creation:

```ts
const socket = new ClassicPreset.Socket("number");
const node = new ClassicPreset.Node("Add");

node.addInput("a", new ClassicPreset.Input(socket, "A"));
node.addInput("b", new ClassicPreset.Input(socket, "B"));
node.addOutput("result", new ClassicPreset.Output(socket, "Result"));

await editor.addNode(node);
```

Use app-specific node/connection subclasses when methods, metadata, or stronger
runtime typing are useful. If ports change after a node is rendered, update the
node data and call:

```ts
await area.update("node", node.id);
```

Dynamic ports are application-owned. Rete will render what the node exposes, but
the app must decide whether a port is valid, persisted, visible, or compatible.

## Connections

Programmatic connections use source node, output key, target node, and input key:

```ts
await editor.addConnection(
  new ClassicPreset.Connection(sourceNode, "result", targetNode, "value")
);
```

Interactive user wiring comes from `ConnectionPlugin`. Use `ClassicFlow` for
normal output-to-input wiring and `BidirectFlow` when either side can start the
gesture. The connections guide shows selecting a flow per socket and disabling
interaction for sockets that should not start a drag.

For custom connection objects, configure `makeConnection` on `ClassicFlow` or
`BidirectFlow`. Use `getSourceTarget(from, to)` because the initial and final
socket data may not already be normalized as output/input.

Connection pick/drop signals are useful for preview UX:

- `connectionpick`: a drag starts from a socket
- `connectiondrop`: a drag ends on a socket or the area

Those signals can drive compatible-target highlighting, dimming, or cleanup, but
consumer-side validation should still decide whether a connection is accepted.

## Validation

Rete validation is commonly implemented with pipes:

```ts
editor.addPipe(context => {
  if (context.type === "connectioncreate") {
    if (!canCreateConnection(editor, context.data)) {
      return;
    }
  }

  return context;
});
```

Returning no context cancels message propagation for creation/removal messages
such as `nodecreate`, `noderemove`, `connectioncreate`, and
`connectionremove`.

Upstream examples often model socket compatibility through custom socket classes
with an `isCompatibleWith` method. BlazorReteJs can use either custom socket
classes or app-owned metadata, but the generic bridge should keep the rule
advisory unless a consumer explicitly asks the bridge to reject the operation.

## Rendering And Socket Geometry

`rete-react-plugin` classic presets can be customized with React components for
nodes, controls, sockets, and connections. In this package, the important files
are:

- `wwwroot/ts/rete-custom-node-component.tsx`
- `wwwroot/ts/rete-custom-socket-component.tsx`
- `wwwroot/ts/rete-custom-connection-component.tsx`

Use `rete-render-utils` `getDOMSocketPosition` when the connection endpoint
should be offset from the rendered socket center. For geometry that cannot be
derived efficiently from DOM sockets, implement `BaseSocketPosition` and return
positions relative to the node.

Use `rete-connection-path-plugin` for custom connection path shapes. Keep path
logic separate from connection validation; path shape is visual presentation.

The magnetic connection example is an upstream-supported UX pattern for making
small sockets easier to hit, especially at low zoom. BlazorReteJs already has a
local magnetic connection helper, so prefer adapting that helper over adding a
second connection gesture system.

## Import And Export

Rete does not define a universal import/export format. It can hold plain JSON
objects if they have required ids, or richer class instances with methods, but
serialization is application-specific.

Practical rules:

- serialize app DTOs, not React/Rete runtime objects
- save node ids, labels, positions, dimensions, ports, controls, and app metadata
  that cannot be reconstructed from node type
- recreate nodes and ports before adding connections
- restore positions after nodes exist
- handle import order explicitly when graphs have parents, modules, or nested
  scopes
- use `editor.getNodes()` and `editor.getConnections()` only as runtime reads,
  not as a complete persistence contract

For BlazorReteJs, C# DTOs are the persistence boundary. TypeScript should rebuild
Rete runtime objects from DTOs.

## Selection, Layout, Menus, And History

Useful upstream APIs and patterns:

- `AreaExtensions.selectableNodes` with `selector()` and `accumulateOnCtrl()`
  for multi-select behavior.
- `AreaExtensions.simpleNodesOrder` to bring selected nodes above overlapping
  nodes.
- `AreaExtensions.zoomAt(area, editor.getNodes())` to fit a graph after render;
  provide stable node `width`/`height` if nodes are not measurable yet.
- `rete-auto-arrange-plugin` for ELK-backed auto layout.
- `rete-context-menu-plugin`, `rete-minimap-plugin`, and `rete-dock-plugin` for
  optional UI surfaces.
- `rete-history-plugin` for tracking node/connection add/remove and translate
  operations. It exposes `undo`, `redo`, custom actions, and grouping/separation
  controls.
- `rete-connection-reroute-plugin` when users need editable reroute points on
  long connections.

BlazorReteJs currently owns custom dock behavior and C#-side undo integration.
Do not enable a second independent undo model without deciding how it composes
with the consumer's undo stack.

## Performance Practices

Rete's performance guidance is mostly about avoiding unnecessary browser work:

- connect only the plugins needed for the current editor
- avoid rendering heavy node internals when many nodes are visible at low zoom
- consider level-of-detail rendering for large graphs
- batch or buffer high-frequency movement and viewport events before sending
  them to C#
- avoid rebuilding ports or React node bodies when metadata did not change
- prefer explicit node dimensions when fitting immediately after load

In BlazorReteJs, keep the JS bridge hot paths small. Send coarse-grained DTO
updates from C#, buffer drag streams, and call `area.update("node", id)` only
when Rete needs to re-render a changed node.

## BlazorReteJs Bridge Rules

- Keep `ReteEditorFacade.tsx` close to Rete primitives and the C# facade.
- Keep C# and TypeScript DTOs aligned in naming and semantics.
- Do not put consumer-specific graph validation into the generic bridge.
- Treat client-side compatibility and highlighting as UX hints unless the
  generic API explicitly exposes a validator callback.
- Preserve Blazor node host lifecycle when changing React components.
- Dispose JS modules, facade references, and hosted Blazor content through the
  existing component disposal path.
