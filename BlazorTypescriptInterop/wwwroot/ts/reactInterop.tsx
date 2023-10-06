import * as React from 'react';
import * as ReactDOM from 'react-dom';


export function renderReactComponent(elementId: string, props: any): void {
    const container = document.getElementById(elementId);
    if (!container) return;

    //const element = React.createElement(YourReactComponent, props);
    //ReactDOM.render(element, container);
}

export function renderTestReactComponent(elementId: string): void {
    const container = document.getElementById(elementId);
    if (!container) return;

    ReactDOM.render(
        <h1>Hello, world from React!</h1>,
        container
    );
}

export function disposeReactComponent(elementId: string): void {
    const container = document.getElementById(elementId);
    if (!container) return;
    
    ReactDOM.unmountComponentAtNode(container);
}