import * as React from 'react';
import * as ReactDOM from 'react-dom';


export function renderTestReactComponent(elementId: string): void {
    const container = document.getElementById(elementId);
    if (!container) return;

    ReactDOM.render(
        <h1>Hello, world from React!</h1>,
        container
    );
}