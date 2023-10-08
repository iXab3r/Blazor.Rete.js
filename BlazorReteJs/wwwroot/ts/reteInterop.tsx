import {createRoot} from "react-dom/client";
import * as React from "react";
import {StrictMode} from "react";
import ReteApp from "./reteApp";
import {getEditor} from "./reteEditor";
import {ReteEditorWrapper} from "./reteEditorWrapper";

// Function to create the Rete editor element
export async function createEditorElement(container: HTMLElement): Promise<void> {
    console.info(`Creating Rete container: ${container}`);
    const root = createRoot(container!);
    root.render(
        <StrictMode>
            <ReteApp id={container.id}/>
        </StrictMode>
    );
}

// Function to retrieve the Rete editor by polling
export async function retrieveEditor(container: HTMLElement): Promise<ReteEditorWrapper> {
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

// Function to initialize (create + retrieve) the Rete editor
export async function renderEditor(container: HTMLElement): Promise<ReteEditorWrapper> {
    await createEditorElement(container);
    return await retrieveEditor(container);
}
