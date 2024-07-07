import {createRoot} from "react-dom/client";
import {NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {
    AreaExtra, Rect,
    ReteConnection, ReteConnectionSchemes,
    ReteNode,
    ReteNodeConnectionParams,
    ReteNodeParams,
    ReteNodePosition, RetePoint, ReteRectangle,
    Schemes,
    SelectableNodesAdapter
} from './rete-editor-shared'

import {AutoArrangePlugin} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {ConnectionPathPlugin, Transformers} from 'rete-connection-path-plugin';
import {Presets, ReactPlugin} from "rete-react-plugin";
import {ReadonlyPlugin} from "rete-readonly-plugin";

import {Observable, Subject, Subscription} from 'rxjs';
import {debounceTime, switchMap} from 'rxjs/operators';

import {ReteCustomNodeComponent} from "./rete-custom-node-component";
import {ReteCustomConnectionComponent} from "./rete-custom-connection-component";
import {verticalDockSetup} from "./dock/rete-dock-component";
import {ReteEditorListener} from "./rete-editor-listener";
import {RxObservableCollection} from "./collections/rx-observable-collection";
import {ReteEditorDockManager} from "./dock/rete-editor-dock-manager";
import {ReteCustomSocketComponent} from "./rete-custom-socket-component";
import {MagneticConnection} from "./magnetic-connection/rete-magnetic-connection-component";
import {useMagneticConnectionForEditor} from "./magnetic-connection";
import {Selector} from "rete-area-plugin/_types/extensions";
import {getDOMSocketPosition} from "rete-render-utils";
import {AsyncDockPlugin} from "./dock";
import {DotNetObjectReference} from "./scaffolding/dot-net-object-reference";
import log from "loglevel";
import JsObjectReference = DotNet.JsObjectReference;

// noinspection JSUnusedGlobalSymbols Used from Blazor
export class ReteEditorFacade {
    private readonly _editor: NodeEditor<Schemes>;
    private readonly _areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly _renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private readonly _connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private readonly _arrangePlugin: AutoArrangePlugin<Schemes>;
    private readonly _readonlyPlugin: ReadonlyPlugin<Schemes>;
    private readonly _dockPlugin: AsyncDockPlugin<Schemes>;
    private readonly _dockManager: ReteEditorDockManager<Schemes>;
    private readonly _background: HTMLDivElement = this.prepareBackgroundElement();
    private readonly _eventsListener: ReteEditorListener;
    private readonly _arrangeRequests: Subject<string> = new Subject<string>();
    private readonly _anchors: Subscription = new Subscription();
    private readonly _selectableNodes: SelectableNodesAdapter;
    private readonly _selector: Selector<any>;
    private readonly _container: HTMLElement;
    private readonly _editorId: string;

    private _backgroundEnabled: boolean = false;
    private _readonly: boolean = false;

    constructor(container: HTMLElement) {
        this._editorId = container.id;
        if (!this._editorId) {
            throw new DOMException(`Container must have a proper globally unique id set, but was undefined in element ${container}`);
        }
        this._container = container;
        const editorCanvas = container.querySelector<HTMLElement>("#rete-editor-canvas");
        if (!editorCanvas) {
            throw new DOMException(`Failed to find editor canvas inside ${container} (id: ${container.id})`);
        }

        this._editor = new NodeEditor<Schemes>();
        this._areaPlugin = new AreaPlugin<Schemes, AreaExtra>(editorCanvas);
        this._connectionPlugin = new ConnectionPlugin<Schemes, AreaExtra>();
        this._renderPlugin = new ReactPlugin<Schemes, AreaExtra>({createRoot});
        this._readonlyPlugin = new ReadonlyPlugin<Schemes>();

        this._connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this._editor.use(this._areaPlugin);
        this._editor.use(this._readonlyPlugin.root);
        this._areaPlugin.use(this._connectionPlugin);
        this._areaPlugin.use(this._renderPlugin);

        this._arrangePlugin = new AutoArrangePlugin<Schemes>();
        this._arrangePlugin.addPreset(() => {
            return {
                port(data) {
                    const spacing = data.width / (data.ports + 1)

                    return {
                        x: spacing * (data.index + 1),
                        y: 0,
                        width: 15,
                        height: 15,
                        side: data.side === 'output' ? 'SOUTH' : 'NORTH'
                    }
                },
            }
        })
        this._areaPlugin.use(this._arrangePlugin);

        const accumulating = AreaExtensions.accumulateOnCtrl()
        this._selector = AreaExtensions.selector()
        this._selectableNodes = AreaExtensions.selectableNodes(this._areaPlugin, this._selector, {accumulating: accumulating});

        this._renderPlugin.addPreset(Presets.classic.setup({
            customize: {
                node(data) {
                    return ReteCustomNodeComponent
                },
                connection(data) {
                    if (data.payload.isMagnetic) return MagneticConnection;
                    return ReteCustomConnectionComponent;
                },
                socket(data) {
                    return ReteCustomSocketComponent;
                },
            },
            // eslint-disable-next-line react-hooks/rules-of-hooks
            socketPositionWatcher: getDOMSocketPosition({
                offset: (position, nodeId, side) => {
                    return ({
                        x: position.x,
                        y: position.y + 5 * (side === 'input' ? -1 : 1)
                    });
                }
            })
        }));

        const path = new ConnectionPathPlugin({
            transformer: () => Transformers.classic({vertical: true})
        })
        this._renderPlugin.use(path)

        // disable zoom on double-click
        this._areaPlugin.addPipe(context => {
            if (context.type === 'zoom' && context.data.source === 'dblclick') return
            return context
        })

        this._eventsListener = new ReteEditorListener(this._editor, this._areaPlugin);

        AreaExtensions.simpleNodesOrder(this._areaPlugin);
        useMagneticConnectionForEditor(this._editor, this._connectionPlugin);

        this._dockPlugin = new AsyncDockPlugin<Schemes>();
        this._dockPlugin.addPreset(verticalDockSetup({area: this._areaPlugin}));
        this._areaPlugin.use(this._dockPlugin);
        this._dockManager = new ReteEditorDockManager<Schemes>(this._dockPlugin, nodeParams => this.createNode(nodeParams));

        this._anchors.add(
            this._arrangeRequests.pipe(
                debounceTime(500, undefined),
                switchMap(reason => {
                    console.info(`Rearranging nodes, reason: ${reason}`);
                    return this.arrangeNodes();
                })
            ).subscribe())
    }

    public select(nodeId: string, accumulate: boolean) {
        return this._selectableNodes.select(nodeId, accumulate);
    }

    public get AreaPlugin(): AreaPlugin<Schemes, AreaExtra> {
        return this._areaPlugin;
    }

    public get DockPlugin(): AsyncDockPlugin<Schemes> {
        return this._dockPlugin;
    }

    public getSelectedNodesCollection(): RxObservableCollection<string> {
        return this._eventsListener.getSelectedNodes();
    }

    public getNodesCollection(): RxObservableCollection<string> {
        return this._eventsListener.getNodes();
    }

    public getConnectionsCollection(): RxObservableCollection<string> {
        return this._eventsListener.getConnections();
    }

    public getNodePositionUpdatesObservable(bufferTimeInMs?: number, includeTranslated?: boolean): Observable<ReteNodePosition[]> {
        return this._eventsListener.getNodePositionUpdates(bufferTimeInMs, includeTranslated);
    }

    public getMousePositionInViewport(): RetePoint {
        const area = this._areaPlugin;
        const pointerPosition = area.area.pointer;
        
        return {
            x: pointerPosition.x,
            y: pointerPosition.y,
        };
    }

    public getClientBounds(): ReteRectangle {
        const area = this._areaPlugin;
        const box = area.container.getBoundingClientRect();
        return {
            x: box.left,
            y: box.top,
            width: box.width,
            height: box.height,
        };
    }
    
    public getViewportBounds(): ReteRectangle {
        const area = this._areaPlugin;

        const {x, y, k} = area.area.transform;
        const offsetX = x;
        const offsetY = y;
        const zoomFactor = k;
        
        const box = area.container.getBoundingClientRect();
        const width = box.width / zoomFactor;
        const height = box.height / zoomFactor;
        const left = - offsetX / zoomFactor;
        const top = - offsetY / zoomFactor;

        return {
            x: left,
            y: top,
            width: width,
            height: height,
        };
    }

    public setBackgroundEnabled(value: boolean) {
        if (value === this._backgroundEnabled) {
            return;
        }

        if (value) {
            console.info(`Enabling background`);
            this._areaPlugin.area.content.add(this._background);
        } else {
            console.info(`Disabling background`);
            this._areaPlugin.area.content.remove(this._background);
        }
        this._backgroundEnabled = value;
    }

    public getBackgroundEnabled(): boolean {
        return this._backgroundEnabled;
    }

    public getReadonly(): boolean {
        return this._readonly;
    }

    public setReadonly(value: boolean) {
        if (value === this._readonly) {
            return;
        }

        console.info(`Setting Readonly-mode: ${this._readonly} => ${value}`);
        this._readonly = value;
        if (value === true) {
            this._readonlyPlugin.enable();
        } else {
            this._readonlyPlugin.disable();
        }
    }

    public async removeConnection(connectionId: string): Promise<boolean> {
        console.info(`Removing connection by Id: ${connectionId}`)
        const connection = this._editor.getConnection(connectionId);
        if (!connection) {
            console.warn(`Failed to remove connection by Id ${connectionId} - not found`)
            return false;
        }
        if (await this._editor.removeConnection(connectionId)) {
            return true;
        } else {
            console.warn(`Failed to remove connection by Id ${connectionId}`)
            return false;
        }
    }

    public async updateNodes(nodes: ReteNodeParams[]): Promise<void> {
        if (nodes.length <= 0) {
            return;
        }
        console.info(`Updating ${nodes.length} nodes`);
        for (let nodeParams of nodes) {
            await this.updateNode(nodeParams, true);
        }
    }

    public async updateNode(nodeParams: ReteNodeParams, silent: boolean = false): Promise<void> {
        if (!silent) {
            console.info(`Updating node: ${JSON.stringify(nodeParams)}`);
        }
        // Check if id is provided in nodeParams
        if (!nodeParams.id) {
            throw new Error("Node ID is not specified in the provided parameters.");
        }

        const node = this.findNodeById(nodeParams.id);
        if (!node) {
            throw new Error(`Node with ID ${nodeParams.id} not found.`);
        }

        node.updateParams(nodeParams);
        if (nodeParams.x !== null && nodeParams.x !== undefined && nodeParams.y !== null && nodeParams.y !== undefined) {
            await this._areaPlugin.translate(node.id, {x: nodeParams.x, y: nodeParams.y})
        }

        await this._areaPlugin.update('node', nodeParams.id);
    }

    public async addConnections(connections: ReteNodeConnectionParams[]): Promise<ReteConnection<ReteNode>[]> {
        console.info(`Adding ${connections.length} new connection`)
        let result: ReteConnection<ReteNode>[] = [];
        for (let connectionParams of connections) {
            const node = await this.addConnectionOrThrow(connectionParams);
            result.push(node);
        }

        return result;
    }

    public async addConnection(connectionParams: ReteNodeConnectionParams, silent: boolean = false): Promise<ReteConnection<ReteNode>> {
        if (!silent) {
            console.info(`Adding new connection: ${JSON.stringify(connectionParams)}`);
        }
        return await this.addConnectionOrThrow(connectionParams);
    }

    public async addNodes(nodes: ReteNodeParams[]): Promise<ReteNode[]> {
        console.info(`Adding new ${nodes.length} nodes`);
        let result: ReteNode[] = [];
        for (let nodeParams of nodes) {
            const node = await this.addNodeOrThrow(nodeParams);
            result.push(node);
        }
        return result;
    }

    public async addNode(nodeParams: ReteNodeParams, silent: boolean = false): Promise<ReteNode> {
        if (!silent) {
            console.info(`Adding new node: ${JSON.stringify(nodeParams)}`);
        }

        let node = await this.addNodeOrThrow(nodeParams);
        if (!silent) {
            console.info(`Added new node: ${JSON.stringify(node)}`);
        }
        return node;
    }

    public async removeSelectedNodes(): Promise<void> {
        const nodes = this.getSelectedNodes();
        console.info(`Removing selected nodes: ${nodes.length}`)
        for (let node of nodes) {
            await this.removeNode(node.id);
        }
    }

    public async removeNode(nodeId: string): Promise<boolean> {
        console.info(`Removing node by Id: ${nodeId}`)
        const connections = this._editor.getConnections().filter(x => x.source === nodeId || x.target === nodeId);
        for (let connection of connections) {
            await this.removeConnection(connection.id);
        }

        if (await this._editor.removeNode(nodeId)) {
            return true;
        } else {
            console.warn(`Failed to remove node by Id: ${nodeId}`);
            return false;
        }
    }

    public async clear(): Promise<void> {
        console.info(`Clearing all nodes and connections`)
        await this._editor.clear();
    }

    public async setMaxOutputs(value: number): Promise<void> {
        this.getNodesForOperation().forEach(x => {
            x.maxOutputs = value;
            this._areaPlugin.update('node', x.id);
        });
    }

    public async setMaxInputs(value: number): Promise<void> {
        this.getNodesForOperation().forEach(x => {
            x.maxInputs = value;
            this._areaPlugin.update('node', x.id);
        });
    }

    public async updateConnection(id: string): Promise<void> {
        console.info(`Updating connection: ${id}`)
        await this._areaPlugin.update('connection', id);
    }

    public findNodeById(id: string): ReteNode {
        return this._editor.getNode(id);
    }

    public getNodeById(id: string): ReteNode {
        const result = this.findNodeById(id);
        if (!result) {
            throw new Error(`Node with ID ${id} not found`);
        }
        return result;
    }

    public findConnectionById(id: string): ReteConnectionSchemes {
        return this._editor.getConnection(id);
    }

    public getConnectionById(id: string): ReteConnectionSchemes {
        const result = this.findConnectionById(id);
        if (!result) {
            throw new Error(`Connection with ID ${id} not found`);
        }
        return result;
    }

    public getNodes() {
        return this._editor.getNodes();
    }

    public getSelectedNodes() {
        return this.getNodes().filter(x => x.selected);
    }

    public clearSelectedNodes() {
        const selected = this._selector.entities;
        console.info(`Clearing selection, current: ${JSON.stringify(selected)}`);
        this._selector.unselectAll();
    }

    public setSelectedNodes(nodeIds: string[]) {
        const [first, ...rest] = nodeIds
        console.info(`Selecting nodes by Id: ${JSON.stringify(nodeIds)}`);

        this._selector.unselectAll()
        if (first) {
            this._selectableNodes.select(first, false);
        }
        for (const id of rest) {
            this._selectableNodes.select(id, true);
        }
    }

    public getSelectedNodesIds() {
        return this.getSelectedNodes().map(x => x.id);
    }

    public zoomAtNodes() {
        AreaExtensions.zoomAt(this._areaPlugin, this._editor.getNodes());
    }

    public async arrangeNodes() {
        const elkOptions = {};
        await this._arrangePlugin.layout(
            {
                applier: undefined,
                options: elkOptions
            });
    }

    public destroy() {
        this._anchors.unsubscribe();
        this._areaPlugin?.destroy();
    }

    public async addNodesDotNet(nodes: ReteNodeParams[]): Promise<JsObjectReference[]> {
        const result = await this.addNodes(nodes);
        return result.map(x => DotNet.createJSObjectReference(x));
    }

    public async addConnectionsDotNet(connections: ReteNodeConnectionParams[]): Promise<JsObjectReference[]> {
        const result = await this.addConnections(connections);
        return result.map(x => DotNet.createJSObjectReference(x));
    }

    public addDockTemplate(nodeParams: ReteNodeParams): void {
        if (nodeParams.id !== undefined && nodeParams.id !== null) {
            throw new Error("The 'id' property of nodeParams should be undefined or null.");
        }
        this._dockManager.addTemplate(nodeParams);
    }

    public addDockTemplateHookDotNet(hookRef: DotNetObjectReference) {
        this._dockManager.addHook(hookRef);
    }

    public removeDockTemplateHookDotNet(hookRef: DotNetObjectReference) {
        this._dockManager.removeHook(hookRef);
    }

    private createNode(params: ReteNodeParams): ReteNode {
        return new ReteNode(this._editorId, params);
    }

    private async addConnectionOrThrow(connectionParams: ReteNodeConnectionParams): Promise<ReteConnection<ReteNode>> {
        const sourceNode = this.getNodeById(connectionParams.sourceNodeId);
        const targetNode = this.getNodeById(connectionParams.targetNodeId);

        const connection = new ReteConnection(sourceNode, sourceNode.outputKey, targetNode, targetNode.inputKey);
        if (connectionParams.connectionId) {
            connection.id = connectionParams.connectionId;
        }
        if (await this._editor.addConnection(connection)) {
            return connection;
        } else {
            throw `Failed to add connection ${JSON.stringify(connectionParams)}`;
        }
    }

    private async addNodeOrThrow(nodeParams: ReteNodeParams): Promise<ReteNode> {
        if (nodeParams.id) {
            const existingNode = this.findNodeById(nodeParams.id);

            if (existingNode) {
                console.warn(`Failed to add node with ID ${nodeParams.id} - it already exists: ${JSON.stringify(existingNode)}`);
                throw new Error(`Node with ID ${nodeParams.id} already exists`);
            }
        }
        const node = this.createNode(nodeParams);
        if (await this._editor.addNode(node)) {
            if (nodeParams.x !== null && nodeParams.x !== undefined && nodeParams.y !== null && nodeParams.y !== undefined) {
                const nodePosition = {x: nodeParams.x, y: nodeParams.y};
                await this._areaPlugin.translate(node.id, nodePosition)
            }

            return node;
        } else {
            throw `Failed to add node ${nodeParams.id}`;
        }
    }

    private getNodesForOperation() {
        let selectedNodes = this.getSelectedNodes();
        if (selectedNodes.length <= 0) {
            return this.getNodes();
        } else {
            return selectedNodes;
        }
    }

    private prepareBackgroundElement() {
        const background = document.createElement('div');

        background.classList.add('background');
        background.classList.add('fill-area');

        return background;
    }
}