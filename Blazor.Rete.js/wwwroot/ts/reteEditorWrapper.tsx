import {createRoot} from "react-dom/client";
import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {Node, Schemes} from './reteEditor.shared'
import {ReteStyledNode} from './ReteStyledNode'

import {AutoArrangePlugin, Presets as ArrangePresets} from "rete-auto-arrange-plugin";
import {ConnectionPlugin, Presets as ConnectionPresets} from "rete-connection-plugin";
import {Presets, ReactPlugin} from "rete-react-plugin";
import {AreaExtra} from "./reteEditor";

export class ReteEditorWrapper {
    private editor: NodeEditor<Schemes>;
    private areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private arrangePlugin: AutoArrangePlugin<Schemes>;
    private socket = new ClassicPreset.Socket("socket");

    constructor() {
    }

    public async addNode(label: string): Promise<Node> {
        const node = new Node(label);
        node.addOutput("O", new ClassicPreset.Output(this.socket));
        node.addInput("I", new ClassicPreset.Input(this.socket));
        if (await this.editor.addNode(node)) {
            return node;
        } else {
            throw "Failed to add node";
        }
    }

    public toggleIsActive() {
        this.editor.getNodes().forEach(x => {
            x.isActive = !x.isActive;
            this.areaPlugin.update('node', x.id);
        });
    }

    public zoomAtNodes() {
        AreaExtensions.zoomAt(this.areaPlugin, this.editor.getNodes());
    }

    public async arrangeNodes(animate: boolean) {
        await this.arrangePlugin.layout();
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

    public async init(container: HTMLElement) {
        this.editor = new NodeEditor<Schemes>();
        this.areaPlugin = new AreaPlugin<Schemes, AreaExtra>(container);
        this.connectionPlugin = new ConnectionPlugin<Schemes, AreaExtra>();
        this.renderPlugin = new ReactPlugin<Schemes, AreaExtra>({createRoot});

        AreaExtensions.selectableNodes(this.areaPlugin, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        this.connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this.editor.use(this.areaPlugin);
        this.areaPlugin.use(this.connectionPlugin);
        this.areaPlugin.use(this.renderPlugin);

        this.arrangePlugin = new AutoArrangePlugin<Schemes>();
        this.arrangePlugin.addPreset(ArrangePresets.classic.setup());


        this.renderPlugin.addPreset(Presets.classic.setup({
            customize: {
                node() {
                    return ReteStyledNode
                },
            }
        }))

        AreaExtensions.simpleNodesOrder(this.areaPlugin);
    }

    public destroy() {
        this.areaPlugin?.destroy();
    }
}