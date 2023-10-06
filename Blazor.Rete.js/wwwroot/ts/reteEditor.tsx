import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
    ConnectionPlugin,
    Presets as ConnectionPresets
} from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";

const editors: { [id: string]: ReteEditorWrapper } = {};

export type Schemes = GetSchemes<
    ClassicPreset.Node,
    ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;
export type AreaExtra = ReactArea2D<Schemes>;

export function getEditor(container: HTMLElement) : ReteEditorWrapper {
    const editorWrapper = editors[container.id];
    if (editorWrapper) {
        return editorWrapper;
    }
}

export async function createEditor(container: HTMLElement) {
    console.info(`Creating Rete editor in container(id: ${container.id}): ${container}`)
    const editor = new ReteEditorWrapper();
    await editor.init(container);
    editors[container.id] = editor;
    return {
        destroy: () => editor.destroy()
    };
}

export class ReteEditorWrapper {
    private editor: NodeEditor<Schemes>;
    private areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private renderPlugin: ReactPlugin<Schemes, AreaExtra>;
    private connectionPlugin: ConnectionPlugin<Schemes, AreaExtra>;
    private socket = new ClassicPreset.Socket("socket");
    
    constructor() {
    }
    
    public async addNode(label: string){
        const node = new ClassicPreset.Node(label);
        await this.editor.addNode(node);
    }
    
    public async setup(){
        console.info(`Initializing editor`);
        const nodeA = new ClassicPreset.Node("A");
        nodeA.addControl("a", new ClassicPreset.InputControl("text", { initial: "a" }));
        nodeA.addOutput("a", new ClassicPreset.Output(this.socket));
        await this.editor.addNode(nodeA);

        const nodeB = new ClassicPreset.Node("B");
        nodeB.addControl("b", new ClassicPreset.InputControl("text", { initial: "b" }));
        nodeB.addInput("b", new ClassicPreset.Input(this.socket));
        await this.editor.addNode(nodeB);

        await this.editor.addConnection(new ClassicPreset.Connection(nodeA, "a", nodeB, "b"));

        await this.areaPlugin.translate(nodeA.id, { x: 0, y: 0 });
        await this.areaPlugin.translate(nodeB.id, { x: 270, y: 0 });

        setTimeout(() => {
            // wait until nodes rendered because they dont have predefined width and height
            AreaExtensions.zoomAt(this.areaPlugin, this.editor.getNodes());
        }, 10);
    }

    public async init(container: HTMLElement) {
        this.editor = new NodeEditor<Schemes>();
        this.areaPlugin = new AreaPlugin<Schemes, AreaExtra>(container);
        this.connectionPlugin = new ConnectionPlugin<Schemes, AreaExtra>();
        this.renderPlugin = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

        AreaExtensions.selectableNodes(this.areaPlugin, AreaExtensions.selector(), {
            accumulating: AreaExtensions.accumulateOnCtrl()
        });

        this.renderPlugin.addPreset(Presets.classic.setup());
        this.connectionPlugin.addPreset(ConnectionPresets.classic.setup());
        this.editor.use(this.areaPlugin);
        this.areaPlugin.use(this.connectionPlugin);
        this.areaPlugin.use(this.renderPlugin);
        AreaExtensions.simpleNodesOrder(this.areaPlugin);
    }

    public destroy() {
        this.areaPlugin?.destroy();
    }
}