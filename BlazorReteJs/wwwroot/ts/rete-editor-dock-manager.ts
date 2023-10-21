import {AreaExtra, ReteNodeParams, ReteNodeScheme, ReteNodeSchemes, Schemes} from './rete-editor-shared'
import {DockPlugin} from "rete-dock-plugin";

export class ReteEditorDockManager<T extends Schemes> {
    private readonly dockPlugin: DockPlugin<T>;

    constructor(dockPlugin: DockPlugin<T>) {
        this.dockPlugin = dockPlugin;
    }
    
    public addTemplate(nodeParams: ReteNodeParams): void {
        this.dockPlugin.add(() =>{
            const result = new ReteNodeScheme(nodeParams);
            return result;
        });
    }
}