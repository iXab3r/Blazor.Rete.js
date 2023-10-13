import {createRoot} from "react-dom/client";
import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {Node, Schemes} from './reteEditor.shared'

import {AutoArrangePlugin, Presets as ArrangePresets, ArrangeAppliers} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {Presets, ReactPlugin} from "rete-react-plugin";
import {AreaExtra} from "./reteEditor";
import {prepareBackgroundElement} from "./custom-background";
import {ReteCustomNode} from "./rete-custom-node";
import { ReadonlyPlugin } from "rete-readonly-plugin";

interface DotNetHelper {
    invokeMethodAsync<T>(methodName: string, ...args: any[]): Promise<T>;
}

export class ReteEditorWrapper {
    private editor: NodeEditor<Schemes>;
    private areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private arrangePlugin: AutoArrangePlugin<Schemes>;
    private readonlyPlugin: ReadonlyPlugin<Schemes>;
    private socket = new ClassicPreset.Socket("socket");
    private dotnetHelper: any;
    private readonly selectedNodes = new Set<string>();
    private readonly background: HTMLDivElement = prepareBackgroundElement();
    private _backgroundEnabled: boolean = false;
    
    constructor() {
    }
    
    public async addConnection(sourceNodeId: string, targetNodeId: string, connectionId: string){
        console.info(`Adding new connection: ${sourceNodeId} => ${targetNodeId}`)
        const sourceNode = this.editor.getNode(sourceNodeId);
        const targetNode = this.editor.getNode(targetNodeId);
        const connection = new ClassicPreset.Connection(sourceNode, "O", targetNode, "I");
        if (connectionId){
            connection.id = connectionId;
        }
        if (await this.editor.addConnection(connection)) {
            return connection;
        } else {
            throw `Failed to add connection ${sourceNodeId} => ${targetNodeId}`;
        }
    }
    
    public enableReadonly(){
        console.info(`Enabling readonly-mode, enabled: ${this.readonlyPlugin.enabled}`);
        this.readonlyPlugin.enable();
    }

    public disableReadonly(){
        console.info(`Disabling readonly-mode, enabled: ${this.readonlyPlugin.enabled}`);
        this.readonlyPlugin.disable();
    }

    public enableBackground(){
        this.backgroundEnabled = true;
    }

    public disableBackground(){
        this.backgroundEnabled = false;
    }
    
    public getBackgroundEnabled(){
        return this._backgroundEnabled;
    }
    
    get backgroundEnabled(): boolean {
        return this._backgroundEnabled;
    }

    set backgroundEnabled(value: boolean) {
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

    public async removeConnection(connectionId: string): Promise<boolean> {
        console.info(`Removing connection by Id: ${connectionId}`)
        const connection = this.editor.getConnection(connectionId);
        if (!connection){
            console.warn(`Failed to remove connection by Id ${connectionId} - not found`)
            return false;
        }
        if (await this.editor.removeConnection(connectionId)) {
            return true;
        } else {
            console.warn(`Failed to remove connection by Id ${connectionId}`)
            return false;
        }
    }

    public async addNode(label: string, nodeId: string): Promise<Node> {
        console.info(`Adding new node, label: ${label}, Id: ${nodeId}`)
        
        const node = new Node(label);
        if (nodeId){
            node.id = nodeId;
        }
        node.addOutput("O", new ClassicPreset.Output(this.socket, undefined, true));
        node.addInput("I", new ClassicPreset.Input(this.socket, undefined, true));
        if (await this.editor.addNode(node)) {
            return node;
        } else {
            throw "Failed to add node";
        }
    }

    public async removeNode(nodeId: string): Promise<boolean> {
        console.info(`Removing node by Id: ${nodeId}`)
        const connections = this.editor.getConnections().filter(x => x.source === nodeId || x.target === nodeId);
        for (let connection of connections){
            await this.removeConnection(connection.id);
        }

        if (await this.editor.removeNode(nodeId)) {
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

    public updateNode(id: string){
        this.areaPlugin.update('node', id);
    }

    public getSelectedNodes(){
        return this.editor.getNodes().filter(x => x.selected);
    }
    
    public getSelectedNodesIds(){
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
        await this.arrangePlugin.layout({ applier: animate ? applier : undefined });
    }

    public async setup() {
        console.info(`Initializing editor`);
        const nodeA = new Node("A");
        nodeA.isActive = true;
        nodeA.addControl("a", new ClassicPreset.InputControl("text", {initial: "a"}));
        nodeA.addOutput("a", new ClassicPreset.Output(this.socket));
        await this.editor.addNode(nodeA);

        const nodeB = new Node("B");
        nodeB.addControl("b", new ClassicPreset.InputControl("text", {initial: "b"}));
        nodeB.addInput("b", new ClassicPreset.Input(this.socket));
        await this.editor.addNode(nodeB);

        await this.editor.addConnection(new ClassicPreset.Connection(nodeA, "a", nodeB, "b"));

        await this.areaPlugin.translate(nodeA.id, {x: 0, y: 0});
        await this.areaPlugin.translate(nodeB.id, {x: 270, y: 0});



        setTimeout(() => {
            // wait until nodes rendered because they dont have predefined width and height
            this.zoomAtNodes();
        }, 10);
    }

    public setDotnetEventsHandler(dotnetHelper: any) {
        this.dotnetHelper = dotnetHelper;
    }
    
    public async init(container: HTMLElement) {
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
                    return ReteCustomNode
                },
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
    }

    public destroy() {
        this.areaPlugin?.destroy();
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
            
            if (this.dotnetHelper){
                this.dotnetHelper.invokeMethodAsync("OnSelectionChanged", Array.from(currentSelectedNodeIds))
            }
        }
    }
}