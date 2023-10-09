import {createRoot} from "react-dom/client";
import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {Node, Schemes} from './reteEditor.shared'
import {ReteStyledNode} from './ReteStyledNode'

import {AutoArrangePlugin, Presets as ArrangePresets, ArrangeAppliers} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {Presets, ReactPlugin} from "rete-react-plugin";
import {AreaExtra} from "./reteEditor";
import {addCustomBackground} from "./custom-background";

interface DotNetHelper {
    invokeMethodAsync<T>(methodName: string, ...args: any[]): Promise<T>;
}

export class ReteEditorWrapper {
    private editor: NodeEditor<Schemes>;
    private areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private arrangePlugin: AutoArrangePlugin<Schemes>;
    private socket = new ClassicPreset.Socket("socket");
    private dotnetHelper: any;
    private readonly selectedNodes = new Set<string>();
    
    constructor() {
    }
    
    public async addConnection(firstNodeId: string, secondNodeId: string){
        const firstNode = this.editor.getNode(firstNodeId);
        const secondNode = this.editor.getNode(secondNodeId);
        const connection = new ClassicPreset.Connection(firstNode, "O", secondNode, "I");
        if (await this.editor.addConnection(connection)) {
            return connection;
        } else {
            throw `Failed to add connection ${firstNodeId} => ${secondNodeId}`;
        }
    }

    public async addNode(label: string): Promise<Node> {
        const node = new Node(label);
        node.addOutput("O", new ClassicPreset.Output(this.socket, undefined, true));
        node.addInput("I", new ClassicPreset.Input(this.socket, undefined, true));
        if (await this.editor.addNode(node)) {
            return node;
        } else {
            throw "Failed to add node";
        }
    }

    public async removeNode(nodeId: string): Promise<void> {
        await this.editor.removeNode(nodeId);
    }

    public async clear(): Promise<void> {
        await this.editor.clear();
    }

    public toggleIsActive() {
        this.editor.getNodes().forEach(x => {
            x.isActive = !x.isActive;
            this.areaPlugin.update('node', x.id);
        });
    }

    public updateNode(id: string){
        console.info(`Updating node: ${id}`);
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

        const nodeSelector = AreaExtensions.selectableNodes(this.areaPlugin, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        this.connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this.editor.use(this.areaPlugin);
        this.areaPlugin.use(this.connectionPlugin);
        this.areaPlugin.use(this.renderPlugin);

        this.arrangePlugin = new AutoArrangePlugin<Schemes>();
        this.arrangePlugin.addPreset(ArrangePresets.classic.setup());
        this.areaPlugin.use(this.arrangePlugin);

        addCustomBackground(this.areaPlugin)

        this.renderPlugin.addPreset(Presets.classic.setup({
            customize: {
                node() {
                    return ReteStyledNode
                },
            }
        }))

        this.editor.addPipe(context => {
            if (context.type === 'nodecreated' ||
                context.type === 'noderemoved' ||
                context.type === 'cleared') {
                console.info(`Context: ${context.type}, data: ${JSON.stringify(context)}`);
                this.updateSelection();
            }
            return context
        })
        
        this.areaPlugin.addPipe(context => {
            if (context.type === 'nodepicked' || 
                context.type === 'render') {
                console.info(`Context: ${context.type}`)
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