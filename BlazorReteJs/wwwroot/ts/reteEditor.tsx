import {Schemes} from './reteEditor.shared'
import {ReactArea2D} from "rete-react-plugin";
import {ReteEditorWrapper} from "./reteEditorWrapper";

const editors: { [id: string]: ReteEditorWrapper } = {};

export type AreaExtra = ReactArea2D<Schemes>;

export function getEditor(container: HTMLElement): ReteEditorWrapper {
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

