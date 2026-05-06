# Rete.js Concepts For Bridge Extensions

This document describes the Rete.js v2 mental model that BlazorReteJs should
preserve as it grows. Use it when adding editor features, custom connection UX,
new DTO fields, validation hooks, rendering changes, or processing support.

The short version: keep the graph core small, compose behavior through plugins
and scopes, treat rendering/interaction/processing as separate layers, and keep
application persistence and domain validation outside the generic bridge unless
the bridge exposes a deliberately generic extension point.

## Upstream Design Principles

Rete.js is intentionally modular:

- `rete` provides the graph editor core, schemes, classic data structures, and
  signal system.
- Plugins add area behavior, rendering, connections, processing, layout, menus,
  readonly mode, history, minimap, scopes, reroute points, and comments.
- Presets are replaceable starter implementations, not final architecture.
- Rendering is separate from graph data and connection interaction.
- Processing is separate from editing.
- Import/export is application-owned because runtime node objects, class
  instances, dynamic ports, nested graphs, and import order are domain-specific.

When extending BlazorReteJs, prefer adding a small bridge feature that maps onto
one of those upstream concepts instead of building a parallel editor framework
inside the wrapper.

## NodeEditor And Schemes

`NodeEditor<Schemes>` owns the graph: nodes, connections, graph mutations, and
editor-level signals. It also extends `Scope`, which means plugins can attach to
it and observe or modify messages.

`Schemes` is the TypeScript shape of the graph. The basic shape can be
`BaseSchemes`, but most projects use `GetSchemes<Node, Connection>` so Rete
plugins can infer node and connection types.

Important extension rules:

- Keep node and connection ids stable. Rete can work with plain objects or class
  instances, but both require ids.
- Use custom node/connection classes when behavior or metadata belongs in the
  TypeScript runtime.
- Use DTOs when the data must cross the Blazor boundary or survive persistence.
- Keep Rete runtime objects on the TypeScript side; rebuild them from C# DTOs.
- Treat `editor.getNodes()` and `editor.getConnections()` as runtime reads, not
  a complete persistence format.

## ClassicPreset

`ClassicPreset` is the standard starter model:

- `Node`
- `Connection`
- `Socket`
- `Input`
- `Output`
- `Control`
- `InputControl`

Using `ClassicPreset` keeps the bridge aligned with the official guides and
with renderer/connection presets. It is fine to extend these classes, but avoid
forking the entire model unless the feature cannot fit through custom metadata,
custom sockets, custom connections, or renderer customization.

Dynamic ports are normal in Rete. After adding or removing inputs/outputs from a
rendered node, call:

```ts
await area.update("node", node.id);
```

Use that deliberately. Updating a node is a render operation; it should happen
only when the rendered structure actually changes.

## Scopes, Signals, And Pipes

`Scope` is Rete's plugin and message primitive. Parent scopes pass signals to
child scopes through `use`, and pipes can observe, transform, or cancel
messages.

Core ideas:

- Plugin order matters because signals flow in connection order.
- `addPipe` is the normal interception point for validation, readonly behavior,
  telemetry, cleanup, and cross-plugin coordination.
- Returning no context cancels message propagation for messages that allow
  cancellation, such as node/connection creation and removal.
- Pipes should be small, deterministic, and async-safe.

Bridge implication: do not bolt on a separate event framework in TypeScript when
a Rete pipe or plugin scope can express the behavior. If a consumer needs to be
consulted, the bridge can expose a generic callback/facade path, but the final
shape should still map onto Rete's message flow.

## Plugins

The normal 2D editor stack is:

- `NodeEditor`: graph core and root scope
- `AreaPlugin`: DOM area, pan, zoom, node translation, viewport behavior
- renderer plugin: React/Vue/Angular/Svelte/Lit visual components
- `ConnectionPlugin`: interactive connection gestures

Additional plugins are optional capabilities:

- `rete-auto-arrange-plugin`: layout
- `rete-context-menu-plugin`: context menus
- `rete-dock-plugin`: node template dock
- `rete-history-plugin`: undo/redo actions
- `rete-minimap-plugin`: minimap
- `rete-readonly-plugin`: blocks editing behavior
- `rete-scopes-plugin`: nested nodes/subgraphs
- `rete-connection-path-plugin`: visual path curves
- `rete-connection-reroute-plugin`: user-editable connection points
- `rete-comment-plugin`: comments

Add plugins only when the feature needs them. The performance guide explicitly
recommends connecting only the plugins needed for a given editor, especially for
non-visual graph transformations.

Readonly is a good example of plugin ordering: the readonly root/area plugins
must be connected before other plugins so they can prevent events correctly.

## Presets

Presets are bundles of ready-made functionality:

- classic data structures in `rete`
- classic renderer components in renderer packages
- classic connection behavior in `rete-connection-plugin`
- classic history behavior in `rete-history-plugin`
- classic scopes behavior in `rete-scopes-plugin`

Use presets as defaults, then replace the smallest relevant piece:

- customize render components for visual changes
- customize connection flow for interaction changes
- customize sockets/classes for compatibility metadata
- add pipes for validation and policy
- add a focused plugin for reusable behavior that does not belong to one node

Avoid copying a preset wholesale unless the extension truly changes the full
category of behavior.

## Rendering Layer

Rete rendering is intentionally framework-independent. BlazorReteJs currently
uses React as the Rete renderer and hosts Blazor content inside React-rendered
nodes.

Keep these layers distinct:

- Rete graph data: node ids, ports, connections, metadata
- Area behavior: pan, zoom, node translation, z-order
- Renderer components: node body, socket, control, connection visuals
- Hosted Blazor content: consumer-provided UI inside a node

Renderer customization is the right place for visual shape, labels, hover state,
tooltips, badges, path styling, and socket layout. It is not the right place for
authoritative graph validation or persistence migration.

For custom socket geometry, use Rete render utilities such as DOM socket
positioning or a custom socket position provider. For custom wire curves, use
`rete-connection-path-plugin` and keep path choice separate from connection
validity.

## Connection Interaction

`ConnectionPlugin` owns interactive wire creation. It does not render
connections by itself; rendering belongs to the renderer plugin and path plugin.

Important concepts:

- `ClassicFlow` is the default classic interaction model.
- `BidirectFlow` allows starting from either side and dropping on the opposite
  side.
- During user interaction, Rete creates a pseudo-connection with an `isPseudo`
  marker.
- A preset callback can select a flow per socket or disable interaction for a
  socket.
- `makeConnection` lets a flow create custom connection instances.
- `getSourceTarget(from, to)` normalizes source/target socket data when a custom
  connection is created.

Use connection pick/drop signals for preview behavior such as highlighting,
dimming, and magnetic targeting. Use editor pipes or consumer callbacks for the
actual create/remove decision.

## Validation And Compatibility

Rete's validation story is message-based. Add a pipe, inspect the message, and
return no context to cancel invalid operations.

Common validation points:

- `nodecreate`
- `noderemove`
- `connectioncreate`
- `connectionremove`

Socket compatibility can be modeled with custom socket classes, for example an
`isCompatibleWith` method, or with app-owned metadata. For BlazorReteJs, prefer
a generic compatibility model in TypeScript only when it benefits all consumers.
Otherwise, treat TypeScript compatibility as advisory UI feedback and let the
consumer validate authoritatively through the bridge API.

Do not silently mutate invalid connections into valid ones in the renderer. A
connection should either be accepted as requested, rejected, or replaced through
an explicit command that the consumer can understand.

## Processing Engines

Rete editing and Rete processing are separate. The editor can be used only for
visualization, only for graph processing, or both.

`rete-engine` provides two main processing models:

- Dataflow: a target node requests data from incoming nodes; processing walks
  predecessors and returns output data.
- Control flow: execution starts at a node and each node decides how control
  passes through outgoing connections.

Hybrid processing can combine both. This is powerful, but the generic bridge
should not assume a consumer's execution semantics. If BlazorReteJs grows engine
support, keep it optional and expose it as generic Rete-compatible processing
infrastructure rather than embedding one product's runtime rules.

## Import, Export, And DTO Boundaries

Rete intentionally avoids a universal import/export format. Plain objects are
easy to serialize, but class instances, functions, cycles, dynamic ports, parent
relationships, and nested graphs all need application-specific handling.

BlazorReteJs should keep this boundary clear:

- C# DTOs are the public bridge contract.
- TypeScript creates Rete runtime objects from DTOs.
- Consumers own persisted graph schemas.
- Import should recreate nodes and ports before creating connections.
- Imported graph position and dimensions should be restored after nodes exist.
- Unknown consumer metadata should remain opaque to the generic bridge.

This lets applications evolve storage independently while the bridge keeps
stable rendering and interaction APIs.

## Modules, Scopes, And Nested Graphs

Rete has two related but different ideas for larger graph structure:

- Modules: one graph can be represented by a module node whose ports reflect
  input/output nodes in a nested graph.
- Scopes plugin: nodes can visually contain child nodes; moving a parent can
  move children, and child layout can resize the parent.

Both require explicit structure from the application. The scopes plugin also
expects explicit node dimensions. If BlazorReteJs adds nested graph support, do
it as an explicit bridge feature with clear DTOs for parent ids, dimensions,
expanded state, and import order.

## History, Readonly, Reroute, And Other Capabilities

Rete's optional plugins solve common editor problems, but each introduces its
own state and event policy.

Guidance:

- Use `rete-history-plugin` only after deciding how it composes with C# or
  application-level undo. The plugin tracks graph operations, but shortcuts are
  opt-in and custom actions need explicit modeling.
- Use `rete-readonly-plugin` for broad editor lockout, and connect it before
  plugins that should be blocked.
- Use `rete-connection-reroute-plugin` when users need explicit waypoints on
  long wires. Persist reroute points in consumer DTOs if they must survive
  reload.
- Use `rete-scopes-plugin` for visual containment, not as a hidden storage
  hierarchy unless the consumer schema explicitly says so.

## Performance Model

Rete performance is mostly browser performance: layout, rendering, DOM work,
heavy synchronous JavaScript, and high-frequency events.

Bridge-level rules:

- Connect only the plugins the current editor needs.
- Buffer high-frequency area, pointer, selection, and node movement events
  before crossing into C#.
- Avoid React/Blazor rerenders when only graph data changed invisibly.
- Use stable node dimensions where auto-layout, zoom-to-fit, minimap, or scopes
  need measurements.
- Add level-of-detail rendering for large graphs before adding more DOM-heavy
  decoration.
- Keep connection preview and compatibility calculations cheap enough to run
  during pointer movement.
- Defer diagnostics string building and expensive validation details until
  something fails.

## Extension Checklist

Before adding a feature, choose the Rete-aligned home:

- Graph storage or runtime node shape: `NodeEditor`, custom node/connection
  classes, and bridge DTOs.
- Visual-only change: renderer customization.
- Wire gesture behavior: `ConnectionPlugin`, `ClassicFlow`, `BidirectFlow`, or a
  custom flow.
- Connection shape: `rete-connection-path-plugin`.
- Validation/policy: editor or plugin pipes, optionally backed by a consumer
  callback.
- Layout: area extensions, auto-arrange, node dimensions, or scopes.
- Undo/redo: history plugin or consumer-owned undo, but not two independent
  stacks fighting each other.
- Persistence: consumer schema and C# DTOs, not raw Rete runtime objects.
- Processing: optional Rete engine integration, separate from editor rendering.

If the feature does not fit any of these, reconsider the design. Usually the
Rete model has a place for it; the bridge should expose that place cleanly
instead of hiding it.
