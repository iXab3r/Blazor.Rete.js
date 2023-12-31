﻿import {createRoot} from "react-dom/client";
import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {
    AreaExtra, ReteConnection,
    ReteNodeParams,
    ReteNodePosition,
    ReteNode,
    ReteNodeSchemes,
    ReteNodeStatus,
    Schemes, SelectableNodesAdapter
} from './rete-editor-shared'
import {ElementSizeWatcher} from "./scaffolding/element-size-watcher";

import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import { ConnectionPathPlugin, Transformers } from 'rete-connection-path-plugin';
import {Presets, ReactPlugin} from "rete-react-plugin";
import {ReadonlyPlugin} from "rete-readonly-plugin";
import {DockPlugin} from "rete-dock-plugin";
import { ContextMenuExtra, ContextMenuPlugin, Presets as ContextMenuPresets } from "rete-context-menu-plugin";

import {Subject, Subscription, Observable} from 'rxjs';
import {switchMap, throttleTime, debounceTime} from 'rxjs/operators';

import {ReteCustomNodeComponent} from "./rete-custom-node-component";
import {ReteCustomConnectionComponent} from "./rete-custom-connection-component";
import {verticalDockSetup} from "./dock/rete-dock-component";
import {ReteEditorListener} from "./rete-editor-listener";
import {RxObservableCollection} from "./collections/rx-observable-collection";
import {ReteEditorDockManager} from "./dock/rete-editor-dock-manager";
import {ReteCustomSocketComponent} from "./rete-custom-socket-component";
import { MagneticConnection } from "./magnetic-connection/rete-magnetic-connection-component";
import {useMagneticConnectionForEditor, useMagneticConnection} from "./magnetic-connection";
import { setupMouseAreaSelection } from './selection';
import {Selector} from "rete-area-plugin/_types/extensions";
import {getDOMSocketPosition} from "rete-render-utils";

export class ReteEditorFacade  {
    private readonly editor: NodeEditor<Schemes>;
    private readonly editorSizeWatcher: ElementSizeWatcher;
    private readonly areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private readonly connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private readonly arrangePlugin: AutoArrangePlugin<Schemes>;
    private readonly readonlyPlugin: ReadonlyPlugin<Schemes>;
    private readonly dockPlugin: DockPlugin<Schemes>;
    private readonly dockManager: ReteEditorDockManager<Schemes>;
    private readonly background: HTMLDivElement = this.prepareBackgroundElement();
    private readonly eventsListener: ReteEditorListener;
    private readonly arrangeRequests: Subject<string> = new Subject<string>();
    private readonly anchors: Subscription = new Subscription();
    private readonly selectableNodes: SelectableNodesAdapter;
    private readonly selector: Selector<any>;

    private _backgroundEnabled: boolean = false;
    private _arrangeDirection: string = undefined;
    private _arrangeAlgorithm: string = undefined;
    private _arrangeAnimate: boolean = false;
    private _readonly: boolean = false;
    private _autoArrange: boolean = false;

    constructor(container: HTMLElement) {
        this.editor = new NodeEditor<Schemes>();
        this.areaPlugin = new AreaPlugin<Schemes, AreaExtra>(container);
        this.connectionPlugin = new ConnectionPlugin<Schemes, AreaExtra>();
        this.renderPlugin = new ReactPlugin<Schemes, AreaExtra>({createRoot});
        this.readonlyPlugin = new ReadonlyPlugin<Schemes>();

        this.connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this.editor.use(this.areaPlugin);
        this.editor.use(this.readonlyPlugin.root);
        this.areaPlugin.use(this.connectionPlugin);
        this.areaPlugin.use(this.renderPlugin);

        this.arrangePlugin = new AutoArrangePlugin<Schemes>();
        this.arrangePlugin.addPreset(() => {
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
        this.areaPlugin.use(this.arrangePlugin);

        const accumulating = AreaExtensions.accumulateOnCtrl()
        this.selector = AreaExtensions.selector()
        this.selectableNodes = AreaExtensions.selectableNodes(this.areaPlugin, this.selector, { accumulating: accumulating });

        this.renderPlugin.addPreset(Presets.classic.setup({
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
            transformer: () => Transformers.classic({ vertical: true })
        })
        this.renderPlugin.use(path)

        // disable zoom on double-click
        this.areaPlugin.addPipe(context => {
            if (context.type ===  'zoom' && context.data.source === 'dblclick') return
            return context
        })

        this.eventsListener = new ReteEditorListener(this.editor, this.areaPlugin);
        AreaExtensions.simpleNodesOrder(this.areaPlugin);
        useMagneticConnectionForEditor(this.editor, this.connectionPlugin);

        this.dockPlugin = new DockPlugin<Schemes>();
        this.dockPlugin.addPreset(verticalDockSetup({ area: this.areaPlugin }));
        this.areaPlugin.use(this.dockPlugin);
        this.dockManager = new ReteEditorDockManager<Schemes>(this.dockPlugin);

        this.editorSizeWatcher = new ElementSizeWatcher(container);
        this.editorSizeWatcher.addSizeChangeHandler(async (width, height) => {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Container(id: ${container.id}) size changed: ${width}x${height}`)
            }
        });

        this.anchors.add(
            this.arrangeRequests.pipe(
                debounceTime(500, undefined),
                switchMap(reason => {
                    console.info(`Rearranging nodes, reason: ${reason}`);
                    return this.arrangeNodes();
                })
            ).subscribe())
    }

    public select(nodeId: string, accumulate: boolean){
        return this.selectableNodes.select(nodeId, accumulate);
    }
    
    public getAreaPlugin() : AreaPlugin<Schemes, AreaExtra>{
        return this.areaPlugin;
    }

    public getSelectedNodesCollection(): RxObservableCollection<string>{
        return this.eventsListener.getSelectedNodes();
    }
    
    public getNodesCollection(): RxObservableCollection<string>{
        return this.eventsListener.getNodes();
    } 
    
    public getConnectionsCollection(): RxObservableCollection<string>{
        return this.eventsListener.getConnections();
    }

    public getNodePositionUpdatesObservable(bufferTimeInMs?: number, includeTranslated?: boolean): Observable<ReteNodePosition[]> {
        return this.eventsListener.getNodePositionUpdates(bufferTimeInMs, includeTranslated);
    }
    
    public getAutoArrange(): boolean {
        return this._autoArrange;
    }

    public setAutoArrange(value: boolean) {
        if (value === this._autoArrange) {
            return;
        }

        console.info(`Setting AutoArrange: ${this._autoArrange} => ${value}`);
        this._autoArrange = value;

        if (this._autoArrange) {
            this.arrangeRequests.next(`Enabled auto-arrange`);
        }
    }
    
    public getArrangeAnimate(): boolean {
        return this._arrangeAnimate;
    }

    public setArrangeAnimate(value: boolean) {
        if (value === this._arrangeAnimate) {
            return;
        }

        console.info(`Setting ArrangeAnimate: ${this._arrangeAnimate} => ${value}`);
        this._arrangeAnimate = value;
    }

    public getArrangeDirection(): string {
        return this._arrangeDirection;
    }

    public setArrangeDirection(value: string) {
        if (value === this._arrangeDirection) {
            return;
        }

        console.info(`Setting arrange direction: ${this._arrangeDirection} => ${value}`);
        this._arrangeDirection = value;
        if (this._autoArrange) {
            this.arrangeRequests.next(`Changed arrange direction to ${value}`);
        }
    }

    public getArrangeAlgorithm(): string {
        return this._arrangeAlgorithm;
    }

    public setArrangeAlgorithm(value: string) {
        if (value === this._arrangeAlgorithm) {
            return;
        }

        console.info(`Setting arrange algorithm: ${this._arrangeAlgorithm} => ${value}`);
        this._arrangeAlgorithm = value;
        if (this._autoArrange) {
            this.arrangeRequests.next(`Changed arrange algorithm to ${value}`);
        }
    }

    public setBackgroundEnabled(value: boolean) {
        if (value === this._backgroundEnabled) {
            return;
        }

        if (value) {
            console.info(`Enabling background`);
            this.areaPlugin.area.content.add(this.background);
        } else {
            console.info(`Disabling background`);
            this.areaPlugin.area.content.remove(this.background);
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
            this.readonlyPlugin.enable();
        } else {
            this.readonlyPlugin.disable();
        }
    }

    public async addConnection(sourceNodeId: string, targetNodeId: string, connectionId: string) {
        console.info(`Adding new connection: ${sourceNodeId} => ${targetNodeId}`)
        const sourceNode = this.getNodeById(sourceNodeId);
        const targetNode = this.getNodeById(targetNodeId);
        
        const connection = new ReteConnection(sourceNode, sourceNode.outputKey, targetNode, targetNode.inputKey);
        if (connectionId) {
            connection.id = connectionId;
        }
        if (await this.editor.addConnection(connection)) {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Added new connection ${sourceNodeId} => ${targetNodeId} (${connection.id})`);
            }
            return connection;
        } else {
            throw `Failed to add connection ${sourceNodeId} => ${targetNodeId}`;
        }
    }

    public async removeConnection(connectionId: string): Promise<boolean> {
        console.info(`Removing connection by Id: ${connectionId}`)
        const connection = this.editor.getConnection(connectionId);
        if (!connection) {
            console.warn(`Failed to remove connection by Id ${connectionId} - not found`)
            return false;
        }
        if (await this.editor.removeConnection(connectionId)) {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Removed connection ${connectionId}`);
            }
            return true;
        } else {
            console.warn(`Failed to remove connection by Id ${connectionId}`)
            return false;
        }
    }

    public async updateNode(nodeParams: ReteNodeParams): Promise<void> {
        console.info(`Updating node: ${JSON.stringify(nodeParams)}`);

        // Check if id is provided in nodeParams
        if (!nodeParams.id) {
            throw new Error("Node ID is not specified in the provided parameters.");
        }

        const node = this.getNodeById(nodeParams.id);
        if (!node) {
            throw new Error(`Node with ID ${nodeParams.id} not found.`);
        }

        node.updateParams(nodeParams);
        if (nodeParams.x !== null && nodeParams.x !== undefined && nodeParams.y !== null && nodeParams.y !== undefined) {
            await this.areaPlugin.translate(node.id, { x: nodeParams.x, y: nodeParams.y })
        }

        await this.areaPlugin.update('node', nodeParams.id);
    }

    public async addNode(nodeParams: ReteNodeParams): Promise<ReteNode> {
        console.info(`Adding new node: ${JSON.stringify(nodeParams)}`);

        if (nodeParams.id) {
            const existingNode = this.getNodeById(nodeParams.id);
            
            if (existingNode){
                console.warn(`Failed to add node with ID ${nodeParams.id} - it already exists: ${JSON.stringify(existingNode)}`);
                throw new Error(`Node with ID ${nodeParams.id} already exists`);
            }
        }

        const node = new ReteNode(nodeParams);
        
        if (await this.editor.addNode(node)) {
           
            console.info(`Added new node: ${JSON.stringify(node)}`);
            if (nodeParams.x !== null && nodeParams.x !== undefined && nodeParams.y !== null && nodeParams.y !== undefined) {
                const nodePosition = { x: nodeParams.x, y: nodeParams.y };
                await this.areaPlugin.translate(node.id, nodePosition)
                console.info(`Positioned new node: ${nodePosition}`);
            }
            if (this._autoArrange) {
                this.arrangeRequests.next(`Added node ${node.id}`);
            }
            return node;
        } else {
            throw "Failed to add node";
        }
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
        const connections = this.editor.getConnections().filter(x => x.source === nodeId || x.target === nodeId);
        for (let connection of connections) {
            await this.removeConnection(connection.id);
        }

        if (await this.editor.removeNode(nodeId)) {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Removed node ${nodeId}`);
            }
            return true;
        } else {
            console.warn(`Failed to remove node by Id: ${nodeId}`);
            return false;
        }
    }

    public async clear(): Promise<void> {
        console.info(`Clearing all nodes and connections`)
        await this.editor.clear();
    }

    public toggleIsActive() {
        this.getNodesForOperation().forEach(x => {
            if (x.status === ReteNodeStatus.None){
                x.status = ReteNodeStatus.Success;
            } else{
                x.status = ReteNodeStatus.None;
            }
            this.areaPlugin.update('node', x.id);
        });
    }

    public setMaxOutputs(value: number) {
        this.getNodesForOperation().forEach(x => {
            x.maxOutputs = value;
            this.areaPlugin.update('node', x.id);
        });
    }

    public setMaxInputs(value: number) {
        this.getNodesForOperation().forEach(x => {
            x.maxInputs = value;
            this.areaPlugin.update('node', x.id);
        });
    }

    public updateConnection(id: string) {
        console.info(`Updating connection: ${id}`)
        this.areaPlugin.update('connection', id);
    }

    public updateControl(id: string) {
        this.areaPlugin.update('control', id);
    }

    public getNodeById(id: string) {
        return this.editor.getNode(id);
    } 
    
    public getConnectionById(id: string) {
        return this.editor.getConnection(id);
    }

    public getNodes() {
        return this.editor.getNodes();
    }

    public getSelectedNodes() {
        return this.getNodes().filter(x => x.selected);
    }
    
    public clearSelectedNodes() {
        const selected = this.selector.entities;
        console.info(`Clearing selection, current: ${JSON.stringify(selected)}`);
        this.selector.unselectAll();
    }
    
    public setSelectedNodes(nodeIds: string[]) {
        const [first, ...rest] = nodeIds
        console.info(`Selecting nodes by Id: ${JSON.stringify(nodeIds)}`);
        
        this.selector.unselectAll()
        if (first) {
            this.selectableNodes.select(first, false);
        }
        for (const id of rest) {
            this.selectableNodes.select(id, true);
        }
    }

    public getSelectedNodesIds() {
        return this.getSelectedNodes().map(x => x.id);
    }

    public zoomAtNodes() {
        AreaExtensions.zoomAt(this.areaPlugin, this.editor.getNodes());
    }

    public async arrangeNodes() {
        const area = this.areaPlugin;
        const editor = this.editor;
        const animatedApplied = new ArrangeAppliers.TransitionApplier<Schemes, never>({
            duration: 500,
            timingFunction: (t) => t,
            async onTick() {
                await AreaExtensions.zoomAt(area, editor.getNodes());
            }
        });

        const elkOptions = {};

        if (this._arrangeDirection) {
            elkOptions["elk.direction"] = this._arrangeDirection;
        }

        if (this._arrangeAlgorithm) {
            elkOptions["elk.algorithm"] = this._arrangeAlgorithm;
        }

        await this.arrangePlugin.layout(
            {
                applier: this._arrangeAnimate ? animatedApplied : undefined,
                options: elkOptions
            });
    }

    public addDockTemplate(nodeParams: ReteNodeParams): void {
        if (nodeParams.id !== undefined && nodeParams.id !== null) {
            throw new Error("The 'id' property of nodeParams should be undefined or null.");
        }
        this.dockManager.addTemplate(nodeParams);
    }

    public destroy() {
        this.anchors.unsubscribe();
        this.areaPlugin?.destroy();
        this.editorSizeWatcher?.destroy()
    }
    
    private getNodesForOperation(){
        let selectedNodes = this.getSelectedNodes();
        if (selectedNodes.length <= 0){
            return this.getNodes();
        } else{
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