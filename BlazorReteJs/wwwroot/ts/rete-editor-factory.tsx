import {ReteEditorFacade} from "./rete-editor-facade";
import ReteComponent from "./rete-component";
import {createRoot} from "react-dom/client";
import * as React from "react";
import {StrictMode} from "react";
import {setupMouseAreaSelection} from "./selection";
import { AreaExtensions, AreaPlugin, Drag } from 'rete-area-plugin';

const editors: { [id: string]: ReteEditorFacade } = {};

// Function to initialize (create + retrieve) the Rete editor
export async function renderEditor(container: HTMLElement): Promise<ReteEditorFacade> {
    await createEditorElement(container);
    return await retrieveEditor(container);
}

export async function createEditor(container: HTMLElement) {
    if (!container) {
        throw new Error(`Rete Editor container is not specified`);
    }
    
    console.info(`Creating Rete editor in container(id: ${container.id}): ${container}`)
   
    const editor = new ReteEditorFacade(container);
    const areaPlugin = editor.AreaPlugin;
    const selection = setupMouseAreaSelection(areaPlugin, {
        selected(ids) {
            editor.setSelectedNodes(ids)            
        },
    })
    
    editors[container.id] = editor;
    return {
        setSelectionMode: selection.setMode,
        setSelectionShape: selection.setShape,
        setSelectionButton(button: 0 | 1) {
            const panningButton = button ? 0 : 1

            editor.AreaPlugin.area.setDragHandler(new Drag({
                down: e => {
                    if (e.pointerType === 'mouse' && e.button !== panningButton) return false
                    e.preventDefault()
                    return true
                },
                move: () => true
            }))

            selection.setButton(button)
        },
        destroy: () => editor.destroy()
    };
}

function getEditor(container: HTMLElement): ReteEditorFacade {
    if (!container) {
        throw new Error(`Rete Editor container is not specified`);
    }
    
    const editorWrapper = editors[container.id];
    if (editorWrapper) {
        return editorWrapper;
    }
}

async function createEditorElement(container: HTMLElement): Promise<void> {
    if (!container) {
        throw new Error(`Rete Editor container is not specified`);
    }
    console.info(`Creating React Rete container inside(id: ${container.id}): ${container}`);
    const root = createRoot(container!);
    root.render(
        <StrictMode>
            <ReteComponent id={container.id}/>
        </StrictMode>
    );
}

async function retrieveEditor(container: HTMLElement): Promise<ReteEditorFacade> {
    if (!container) {
        throw new Error(`Rete Editor container is not specified`);
    }
    
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

