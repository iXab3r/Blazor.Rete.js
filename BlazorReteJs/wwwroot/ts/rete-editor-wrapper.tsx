import {createRoot} from "react-dom/client";
import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {ReteNodeScheme, Schemes} from './rete-editor-shared'
import {ElementSizeWatcher} from "./scaffolding/element-size-watcher";

import {ArrangeAppliers, AutoArrangePlugin, Presets as ArrangePresets} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {Presets, ReactPlugin} from "rete-react-plugin";
import {AreaExtra} from "./rete-editor-factory";
import {ReadonlyPlugin} from "rete-readonly-plugin";
import { DockPlugin, DockPresets } from "rete-dock-plugin";

import {Subject, Subscription} from 'rxjs';
import {switchMap, throttleTime} from 'rxjs/operators';

import {ReteCustomNodeComponent} from "./rete-custom-node-component";
import {ReteCustomConnectionComponent} from "./rete-custom-connection-component";

export class ReteEditorWrapper {
    private readonly editor: NodeEditor<Schemes>;
    private readonly editorSizeWatcher: ElementSizeWatcher;
    private readonly areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private readonly connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private readonly arrangePlugin: AutoArrangePlugin<Schemes>;
    private readonly readonlyPlugin: ReadonlyPlugin<Schemes>;
    private readonly socket: ClassicPreset.Socket = new ClassicPreset.Socket("socket");
    private readonly selectedNodes: Set<string> = new Set<string>();
    private readonly background: HTMLDivElement = this.prepareBackgroundElement();
    private readonly arrangeRequests: any = new Subject<string>();
    private readonly anchors: Subscription = new Subscription();

    private _backgroundEnabled: boolean = false;
    private _arrangeDirection: string = undefined;
    private _arrangeAlgorithm: string = undefined;
    private _readonly: boolean = false;
    private _autoArrange: boolean = false;
    private _dotnetHelper: any;

    constructor(container: HTMLElement) {
        this.editor = new NodeEditor<Schemes>();
        this.areaPlugin = new AreaPlugin<Schemes, AreaExtra>(container);
        this.connectionPlugin = new ConnectionPlugin<Schemes, AreaExtra>();
        this.renderPlugin = new ReactPlugin<Schemes, AreaExtra>({createRoot});
        this.readonlyPlugin = new ReadonlyPlugin<Schemes>();

        const nodeSelector = AreaExtensions.selectableNodes(this.areaPlugin, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        this.connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this.editor.use(this.areaPlugin);
        this.editor.use(this.readonlyPlugin.root);
        this.areaPlugin.use(this.connectionPlugin);
        this.areaPlugin.use(this.renderPlugin);

        this.arrangePlugin = new AutoArrangePlugin<Schemes>();
        this.arrangePlugin.addPreset(ArrangePresets.classic.setup());
        this.areaPlugin.use(this.arrangePlugin);

        this.renderPlugin.addPreset(Presets.classic.setup({
            customize: {
                node(data) {
                    return ReteCustomNodeComponent
                },
                connection(context) {
                    return ReteCustomConnectionComponent;
                }
            }
        }))

        this.editor.addPipe(context => {
            if (context.type === 'nodecreated' ||
                context.type === 'noderemoved' ||
                context.type === 'cleared') {
                this.updateSelection();
            }
            return context
        })

        this.areaPlugin.addPipe(context => {
            if (context.type === 'nodepicked' ||
                context.type === 'render') {
                this.updateSelection();
            }
            return context
        })

        AreaExtensions.simpleNodesOrder(this.areaPlugin);

        this.editorSizeWatcher = new ElementSizeWatcher(container);
        this.editorSizeWatcher.addSizeChangeHandler(async (width, height) => {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Container(id: ${container.id}) size changed: ${width}x${height}`)
            }
        });

        this.anchors.add(
            this.arrangeRequests.pipe(
                throttleTime(500, undefined, {leading: true, trailing: true}),
                switchMap(reason => {
                    console.info(`Rearranging nodes, reason: ${reason}`);
                    return this.arrangeNodes(true);
                })
            ).subscribe())
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

        console.info(`Setting Readonly-mode: ${this._arrangeDirection} => ${value}`);
        this._readonly = value;
        if (value === true) {
            this.readonlyPlugin.enable();
        } else {
            this.readonlyPlugin.disable();
        }
    }

    public async addConnection(sourceNodeId: string, targetNodeId: string, connectionId: string) {
        console.info(`Adding new connection: ${sourceNodeId} => ${targetNodeId}`)
        const sourceNode = this.editor.getNode(sourceNodeId);
        const targetNode = this.editor.getNode(targetNodeId);
        const connection = new ClassicPreset.Connection(sourceNode, "O", targetNode, "I");
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

    public async addNode(label: string, nodeId: string): Promise<ReteNodeScheme> {
        console.info(`Adding new node, label: ${label}, Id: ${nodeId}`)

        const node = new ReteNodeScheme(label);
        if (nodeId) {
            node.id = nodeId;
        }
        node.addOutput("O", new ClassicPreset.Output(this.socket, undefined, true));
        node.addInput("I", new ClassicPreset.Input(this.socket, undefined, true));
        if (await this.editor.addNode(node)) {
            if (this._autoArrange) {
                this.arrangeRequests.next(`Added node ${node.id}`);
            }
            return node;
        } else {
            throw "Failed to add node";
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
        this.editor.getNodes().forEach(x => {
            x.isActive = !x.isActive;
            this.areaPlugin.update('node', x.id);
        });
    }

    public updateNode(id: string) {
        console.info(`Updating node: ${id}`)
        this.areaPlugin.update('node', id);
    }

    public updateConnection(id: string) {
        console.info(`Updating connection: ${id}`)
        this.areaPlugin.update('connection', id);
    }

    public updateControl(id: string) {
        this.areaPlugin.update('control', id);
    }

    public getNodes() {
        return this.editor.getNodes();
    }

    public getSelectedNodes() {
        return this.getNodes().filter(x => x.selected);
    }

    public getSelectedNodesIds() {
        return this.getSelectedNodes().map(x => x.id);
    }

    public zoomAtNodes() {
        AreaExtensions.zoomAt(this.areaPlugin, this.editor.getNodes());
    }

    public async arrangeNodes(animate: boolean) {
        const area = this.areaPlugin;
        const editor = this.editor;
        const applier = new ArrangeAppliers.TransitionApplier<Schemes, never>({
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
                applier: animate ? applier : undefined,
                options: elkOptions
            });
    }

    public setDotnetEventsHandler(dotnetHelper: any) {
        this._dotnetHelper = dotnetHelper;
    }

    public destroy() {
        this.anchors.unsubscribe();
        this.areaPlugin?.destroy();
        this.editorSizeWatcher?.destroy()
    }

    private prepareBackgroundElement() {
        const background = document.createElement('div');

        background.classList.add('background');
        background.classList.add('fill-area');

        return background;
    }

    private updateSelection() {
        const currentSelectedNodes = this.getSelectedNodes();
        const currentSelectedNodeIds = new Set(currentSelectedNodes.map(node => node.id.toString()));

        const addedNodes: string[] = [];
        const removedNodes: string[] = [];

        // Remove nodes that are no longer selected
        this.selectedNodes.forEach(nodeId => {
            if (!currentSelectedNodeIds.has(nodeId)) {
                this.selectedNodes.delete(nodeId);
                removedNodes.push(nodeId);
            }
        });

        // Add newly selected nodes
        currentSelectedNodeIds.forEach(nodeId => {
            if (!this.selectedNodes.has(nodeId)) {
                this.selectedNodes.add(nodeId);
                addedNodes.push(nodeId);
            }
        });

        // Logging changes
        if (addedNodes.length > 0 || removedNodes.length > 0) {
            if (removedNodes.length > 0) {
                console.log(`Selection changed, removed nodes: ${removedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
            }
            if (addedNodes.length > 0) {
                console.log(`Selection changed, added nodes: ${addedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
            }

            if (this._dotnetHelper) {
                this._dotnetHelper.invokeMethodAsync("OnSelectionChanged", Array.from(currentSelectedNodeIds))
            }
        }
    }
}