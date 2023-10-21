import {ClassicPreset, NodeEditor} from "rete";
import {AreaExtensions, AreaPlugin} from "rete-area-plugin";
import {ReteNodeScheme, Schemes} from './rete-editor-shared'
import {AreaExtra} from "./rete-editor-shared";

import {Subject, Subscription, Observable, merge, tap} from 'rxjs';
import {RxObservableCollection} from "./collections/rx-observable-collection";

export class ReteEditorListener {
    private readonly editor: NodeEditor<Schemes>;
    private readonly areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly anchors: Subscription = new Subscription();
    private readonly nodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly selectedNodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly connections: RxObservableCollection<string> = new RxObservableCollection<string>();

    constructor(editor: NodeEditor<Schemes>, areaPlugin: AreaPlugin<Schemes, AreaExtra>) {
        this.editor = editor;
        this.areaPlugin = areaPlugin;

        this.anchors.add(this.selectionObservable()
            .pipe(tap(() => this.updateSelection()))
            .subscribe());

        this.editor.addPipe(ctx => {
            if (ctx.type === 'nodecreated'){
                this.nodes.add(ctx.data.id);
            }

            if (ctx.type === 'noderemoved'){
                this.nodes.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared'){
                this.nodes.clear()
            }

            return ctx;
        });

        this.editor.addPipe(ctx => {
            if (ctx.type === 'connectioncreated'){
                this.connections.add(ctx.data.id);
            }

            if (ctx.type === 'connectionremoved'){
                this.connections.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared'){
                this.connections.clear()
            }

            return ctx;
        });
    }

    public getNodes(): RxObservableCollection<string>{
        return this.nodes;
    }

    public getSelectedNodes(): RxObservableCollection<string>{
        return this.selectedNodes;
    }
    
    public getConnections() : RxObservableCollection<string>{
        return this.connections;
    }
    
    private selectionObservable(): any {
        const editorEvents$ = new Observable(context => {
            this.editor.addPipe(ctx => {
                if (ctx.type === 'nodecreated' ||
                    ctx.type === 'noderemoved' ||
                    ctx.type === 'cleared') {
                    context.next(ctx.type);
                }
                return ctx;
            });
        });

        const areaPluginEvents$ = new Observable(context => {
            this.areaPlugin.addPipe(ctx => {
                if (ctx.type === 'nodepicked' ||
                    ctx.type === 'render') {
                    context.next(ctx.type);
                }
                return ctx;
            });
        });

        return merge(editorEvents$, areaPluginEvents$);
    }

    private updateSelection() {
        const currentSelectedNodes = this.editor.getNodes().filter(x => x.selected);
        const currentSelectedNodeIds = new Set(currentSelectedNodes.map(node => node.id.toString()));

        const addedNodes: string[] = [];
        const removedNodes: string[] = [];

        // Remove nodes that are no longer selected
        this.selectedNodes.getItems().forEach(nodeId => {
            if (!currentSelectedNodeIds.has(nodeId)) {
                removedNodes.push(nodeId);
            }
        });

        // Add newly selected nodes
        currentSelectedNodeIds.forEach(nodeId => {
            if (!this.selectedNodes.contains(nodeId)) {
                addedNodes.push(nodeId);
            }
        });

        // Logging changes
        if (addedNodes.length > 0 || removedNodes.length > 0) {
            if (removedNodes.length > 0) {
                //console.log(`Selection changed, removed nodes: ${removedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this.selectedNodes.removeRange(removedNodes);
            }
            if (addedNodes.length > 0) {
                //console.log(`Selection changed, added nodes: ${addedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this.selectedNodes.addRange(addedNodes);
            }
        }
    }
}