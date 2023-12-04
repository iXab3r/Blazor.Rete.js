import {ReteEditorFacade} from "./rete-editor-facade";
import ReteComponent from "./rete-component";
import {createRoot} from "react-dom/client";
import * as React from "react";
import {StrictMode} from "react";

const editors: { [id: string]: ReteEditorFacade } = {};


// Function to initialize (create + retrieve) the Rete editor
export async function renderEditor(container: HTMLElement): Promise<ReteEditorFacade> {
    await createEditorElement(container);
    return await retrieveEditor(container);
}

export async function createEditor(container: HTMLElement) {
    console.info(`Creating Rete editor in container(id: ${container.id}): ${container}`)
    const editorCanvas = container.querySelector<HTMLElement>("#rete-editor-canvas");
    if (!editorCanvas){
        throw new DOMException(`Failed to find editor canvas`); 
    }
    const editor = new ReteEditorFacade(editorCanvas);
    editors[container.id] = editor;
    return {
        destroy: () => editor.destroy()
    };
}

function getEditor(container: HTMLElement): ReteEditorFacade {
    const editorWrapper = editors[container.id];
    if (editorWrapper) {
        return editorWrapper;
    }
}

async function createEditorElement(container: HTMLElement): Promise<void> {
    console.info(`Creating React Rete container inside(id: ${container.id}): ${container}`);
    const root = createRoot(container!);
    root.render(
        <StrictMode>
            <ReteComponent id={container.id}/>
        </StrictMode>
    );
}

async function retrieveEditor(container: HTMLElement): Promise<ReteEditorFacade> {
    return new Promise((resolve, reject) => {
        let totalWaitTime = 0;
        const interval = 10;  // Polling interval
        const timeout = 1000;  // Total timeout

        const pollForEditor = () => {
            const editor = getEditor(container);
            if (editor) {
                console.info(`Retrieved Rete editor: ${editor}`);
                resolve(editor);
            } else {
                totalWaitTime += interval;
                if (totalWaitTime >= timeout) {
                    reject("Editor retrieval timeout");
                } else {
                    setTimeout(pollForEditor, interval);
                }
            }
        };

        setTimeout(pollForEditor, interval);
    });
}

