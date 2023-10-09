import {ClassicPreset, GetSchemes} from "rete";

export class Node extends ClassicPreset.Node {
    width: number = 180;   
    height: number = 120;
    isActive: boolean;
}

export class Connection<N extends Node> extends ClassicPreset.Connection<N, N> {
}

export type Schemes = GetSchemes<Node, Connection<Node>>;