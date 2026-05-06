# Rete.js AI Brief

This document summarizes upstream Rete.js v2 concepts for agents working on the
generic BlazorReteJs bridge. It intentionally avoids application-specific
behavior.
For a deeper extension-oriented concept guide, continue with
[retejs-concepts.md](retejs-concepts.md). For API recipes and best practices,
continue with [retejs-api-recipes.md](retejs-api-recipes.md).

## Sources

- Rete home: <https://retejs.org/>
- Documentation index: <https://retejs.org/docs/>
- Concepts: <https://retejs.org/docs/concepts/plugin-system/>, <https://retejs.org/docs/concepts/editor/>, <https://retejs.org/docs/concepts/engine/>
- Guides: <https://retejs.org/docs/guides/basic/>, <https://retejs.org/docs/guides/connections/>, <https://retejs.org/docs/guides/validation/>, <https://retejs.org/docs/guides/import-export/>, <https://retejs.org/docs/guides/context-menu/>, <https://retejs.org/docs/guides/minimap/>, <https://retejs.org/docs/guides/dock-menu/>, <https://retejs.org/docs/guides/undo-redo/>, <https://retejs.org/docs/guides/connection-path/>, <https://retejs.org/docs/guides/reroute/>, <https://retejs.org/docs/guides/selectable/>
- API docs: <https://retejs.org/docs/api/rete/>, <https://retejs.org/docs/api/rete-area-plugin/>, <https://retejs.org/docs/api/rete-connection-plugin/>, <https://retejs.org/docs/api/rete-engine/>
- Examples: <https://retejs.org/examples/>, <https://retejs.org/examples/basic/>, <https://retejs.org/examples/arrange/>, <https://retejs.org/examples/magnetic-connection/>

## Pass 1: Skeleton

Rete.js v2 is a TypeScript-first toolkit for node editors and graph processing.
The core package owns graph data and signals. Plugins add area rendering,
connections, UI rendering, layout, history, minimap, context menu, dock, scopes,
and processing.

Key concepts:

- `NodeEditor<Schemes>` owns nodes and connections.
- `ClassicPreset.Node`, `Input`, `Output`, `Socket`, `Control`,
  `InputControl`, and `Connection` are the common starter model.
- `GetSchemes<Node, Connection>` gives TypeScript a typed graph shape.
- `AreaPlugin` owns the 2D editor area, translation, zoom/pan, and area signals.
- Renderer plugins such as `rete-react-plugin` own actual visual components.
- `ConnectionPlugin` handles interactive connection UX but does not itself
  render connection visuals.
- `DataflowEngine` and `ControlFlowEngine` are processing APIs; editing and
  processing are separate concepts.

Most editor operations are async and signal-driven. Operations such as
`addNode`, `addConnection`, `removeNode`, `removeConnection`, `clear`, and
`area.translate` can be observed or blocked through pipes.

## Pass 2: Documentation Concepts

Important packages:

- `rete`: `NodeEditor`, `Scope`, `BaseSchemes`, `GetSchemes`, `ClassicPreset`.
- `rete-area-plugin`: 2D area, node translation/resizing, zoom/pan,
  `AreaExtensions.selector`, `selectableNodes`, `accumulateOnCtrl`,
  `simpleNodesOrder`, and `zoomAt`.
- `rete-connection-plugin`: `ConnectionPlugin`, `ClassicFlow`, `BidirectFlow`,
  `Presets.classic.setup`, `getSourceTarget`, and connection pick/drop signals.
- `rete-engine`: `DataflowEngine.fetch`, `fetchInputs`, `reset`,
  `ControlFlowEngine.execute`, and lower-level data/control-flow classes.
- Renderer plugins: React, Vue, Angular, Svelte, and Lit packages.
- Utility plugins: context menu, minimap, history, dock, scopes, connection
  paths, reroute pins, auto-arrange, readonly, comments.

Design ideas:

- Plugins are `Scope`s. Parent/child scopes are composed with `use`.
- `addPipe` can observe, transform, or cancel editor/plugin operations.
- Plugin order matters, especially for behavior-changing plugins like readonly.
- Rendering is decoupled from graph data and interaction.
- Rete does not impose generic import/export because app-specific classes,
  methods, dynamic ports, nested graphs, and import order matter.
- Validation is commonly implemented with pipes on node/connection
  create/remove signals.
- Socket compatibility can be represented by custom socket classes or app-owned
  validation.
- Dynamic ports require changing node inputs/outputs and then calling
  `area.update('node', node.id)`.
- Nested/module graph processing should use fresh editor/engine instances to
  avoid cross-call conflicts.

## Pass 3: Example Patterns

Common upstream patterns:

- Define reusable node classes by extending `ClassicPreset.Node`.
- Add ports with `addInput` and `addOutput`; add controls with `addControl`.
- Programmatic connections use `new ClassicPreset.Connection(source, outKey,
  target, inKey)`.
- Configure rendering with `AreaPlugin`, `ReactPlugin`, and
  `Presets.classic.setup`.
- Configure user connection UX with `ConnectionPlugin` and
  `ConnectionPresets.classic.setup`; use `ClassicFlow` or `BidirectFlow` for
  more specific interaction styles.
- Use `rete-render-utils` `getDOMSocketPosition` for custom socket geometry.
- Use `rete-connection-path-plugin` for path curves.
- Use `rete-auto-arrange-plugin` for layout, backed by `elk.js`.
- Use `ContextMenuPlugin`, `MinimapPlugin`, `DockPlugin`, `HistoryPlugin`,
  `ScopesPlugin`, and reroute/selectable extensions when those features are
  needed.
- Export with `editor.getNodes()` and `editor.getConnections()`, then serialize
  app-owned fields. Recreate nodes/ports before adding connections on import.

Version note: these notes are for Rete v2. Rete v1 docs live separately and use
different APIs.
