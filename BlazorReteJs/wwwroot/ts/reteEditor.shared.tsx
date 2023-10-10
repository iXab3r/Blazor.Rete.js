import {ClassicPreset, GetSchemes} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";

type NodeExtraData = { 
    width?: number; 
    height?: number;
    isBusy: boolean;
    isActive: boolean;
};

export class Node extends ClassicPreset.Node {
    width: number = 180;   
    height: number = 90;
    isActive: boolean;
}

export class Connection<N extends Node> extends ClassicPreset.Connection<N, N> {
}

export type Schemes = GetSchemes<Node, Connection<Node>>;

export type ReteCustomNodeProps<S extends ClassicScheme> = {
    data: S["Node"] & NodeExtraData;
    styles?: () => any;
    emit: RenderEmit<S>;
};

export type NodeComponent<Scheme extends ClassicScheme> = (
    props: ReteCustomNodeProps<Scheme>
) => JSX.Element;

export function sortByIndex<T extends [string, undefined | { index?: number }][]>(
    entries: T
) {
    entries.sort((a, b) => {
        const ai = a[1]?.index || 0;
        const bi = b[1]?.index || 0;

        return ai - bi;
    });
}
