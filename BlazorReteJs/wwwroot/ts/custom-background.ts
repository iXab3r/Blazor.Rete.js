import { BaseSchemes } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';

export function prepareBackgroundElement() {
    const background = document.createElement('div');

    background.classList.add('background');
    background.classList.add('fill-area');

    return background;
}