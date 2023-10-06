import { createRoot } from "react-dom/client";
import App from "./reteApp";
import {StrictMode} from "react";
import * as React from "react";

export async function renderEditor(elementId: string) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const root = createRoot(container!);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
}
