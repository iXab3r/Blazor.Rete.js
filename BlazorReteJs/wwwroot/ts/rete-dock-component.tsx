import { BaseSchemes } from 'rete'
import { AreaPlugin } from 'rete-area-plugin'

export type Preset = {
    createItem(index?: number): HTMLElement | null
    removeItem(element: HTMLElement): void
}

function createToolbar() {
    const element = document.createElement('div');
    element.classList.add('d-flex', 'flex-column');

    element.addEventListener('pointerdown', e => e.stopPropagation());
    element.addEventListener('contextmenu', e => e.stopPropagation());

    return element;
}

function getNodeContainer() {
    const element = document.createElement('div');
    const { style } = element
    style.scale = "0.7";
    
    return element;
}

export function verticalDockSetup<T>(props: { area: AreaPlugin<BaseSchemes, T> }): Preset {
    const container = props.area.container.parentElement;
    console.info(`Creating Rete toolbar near container(id: ${container.id}): ${container}`)
    
    let toolbarContainer = container.querySelector<HTMLElement>("#rete-editor-toolbar");
    if (!toolbarContainer){
        throw new DOMException(`Failed to find toolbar container`);
    }
    
    const toolbar = createToolbar();
    toolbarContainer.appendChild(toolbar);

    return {
        createItem(index: number) {
            const element = getNodeContainer();
            const beforeChild = typeof index !== 'undefined' ? toolbar.children[index] : null;

            toolbar.insertBefore(element, beforeChild);

            return element;
        },
        removeItem(element: HTMLElement) {
            toolbar.removeChild(element);
        }
    }
}
