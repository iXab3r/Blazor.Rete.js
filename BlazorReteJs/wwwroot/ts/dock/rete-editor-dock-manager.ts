import {AreaExtra, ReteNodeParams, ReteNode, ReteNodeSchemes, Schemes} from '../rete-editor-shared'
import log from 'loglevel';
import {AsyncDockPlugin} from "./index";
import {Strategy} from "./strategy";
import {DotNetObjectReference} from "../scaffolding/dot-net-object-reference";

log.setLevel('info');

export class ReteEditorDockManager<T extends Schemes> {
    private readonly dockPlugin: AsyncDockPlugin<T>;
    private readonly nodeFactory: (params: ReteNodeParams) => ReteNode;
    private hookRefs:Map<number, DotNetObjectReference> = new Map<number, DotNetObjectReference>();

    constructor(dockPlugin: AsyncDockPlugin<T>, nodeFactory: (params: ReteNodeParams) => ReteNode) {
        this.dockPlugin = dockPlugin;
        this.nodeFactory = nodeFactory;
        dockPlugin.dropStrategy = new ReteEditorDockStrategy(dockPlugin.dropStrategy, this.handleCreate.bind(this));
        dockPlugin.clickStrategy = new ReteEditorDockStrategy(dockPlugin.clickStrategy, this.handleCreate.bind(this));
    }

    public addTemplate(nodeParams: ReteNodeParams): void {
        this.dockPlugin.add(async () => {
            return this.nodeFactory(nodeParams);
        });
    }
    
    public addHook(hookRef: DotNetObjectReference){
        log.info(`Adding .net hook ${hookRef} (total: ${this.hookRefs.size})`);
        this.hookRefs.set(hookRef._id, hookRef);
        log.info(`Added .net hook ${hookRef} (total: ${this.hookRefs.size})`);
    }

    public removeHook(hookRef: DotNetObjectReference){
        log.info(`Removing .net hook ${hookRef} (total: ${this.hookRefs.size})`);
        
        if (this.hookRefs.has(hookRef._id)) {
            this.hookRefs.delete(hookRef._id);
            log.info(`Removed .net hook ${hookRef} (total: ${this.hookRefs.size})`);
        } else {
            throw `Failed to find specified .net hook in hook list`
        }
    }
    
    private async handleCreate(nodeParams: ReteNodeParams): Promise<ReteNodeParams> {
        if (this.hookRefs.size <= 0){
            log.info(`No template hooks, propagating initial parameters without changes: ${JSON.stringify(nodeParams)}`);
            return nodeParams;
        }
        
        let finalParams: ReteNodeParams = nodeParams;
        for (const hookRef of this.hookRefs.values()){
            log.info(`Mutating parameters using hook ${hookRef}: ${JSON.stringify(finalParams)}`);
            finalParams = await hookRef.invokeMethodAsync("HandleTemplateCreate", finalParams);
            log.info(`Mutated parameters using hook ${hookRef}: ${JSON.stringify(finalParams)}`);
        }
        return finalParams;
    }
}

class ReteEditorDockStrategy extends Strategy 
{
    private readonly _fallback: Strategy;
    private readonly _provider: (nodeParams: ReteNodeParams) => Promise<ReteNodeParams>;
    
    constructor(fallback: Strategy, provider: (nodeParams: ReteNodeParams) => Promise<ReteNodeParams>) {
        super();
        this._fallback = fallback;
        this._provider = provider;
    }

    add(element: HTMLElement, create: () => Promise<ReteNode>): void {
        log.info(`Adding new node template to HTML container ${element}`);
                
        this._fallback.add(element, async () => {
            log.info(`Adding new node`);
            const node = await create();
            const initialParams = node.getParams();
            const finalParams = await this._provider(initialParams);
            log.info(`Created node: ${node}, initial params: ${JSON.stringify(initialParams)}, final params: ${JSON.stringify(finalParams)}`);
            node.updateParams(finalParams);
            return node;
        });
    }
}
