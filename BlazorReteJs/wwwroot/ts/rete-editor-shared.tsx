import {ClassicPreset, GetSchemes} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";

export class ReteNodeScheme extends ClassicPreset.Node {
    width: number = 180;
    height: number = 90;
    isActive: boolean;
}

export class ReteConnectionScheme<N extends ReteNodeScheme> extends ClassicPreset.Connection<N, N> {}

export type NodeExtraData = { 
    width?: number; 
    height?: number;
    isBusy: boolean;
    isActive: boolean;
    selected: boolean;
};

export type ConnectionExtraData = { 
    isActive?: boolean, 
    isLoop?: boolean 
};

export type ReteNodeSchemes = ReteNodeScheme;
export type ReteConnectionSchemes = ReteConnectionScheme<ReteNodeSchemes>;
export type Schemes = GetSchemes<ReteNodeSchemes, ReteConnectionSchemes>;

export type ReteCustomNodeProps<S extends ClassicScheme> = {
    data: S["Node"] & NodeExtraData;
    styles?: () => any;
    emit: RenderEmit<S>;
};

export type ReteCustomConnectionProps<S extends ClassicScheme> = {
    data: S["Connection"] & ConnectionExtraData;
    styles?: () => any;
    emit: RenderEmit<S>;
};


export type NodeComponent<Scheme extends ClassicScheme> = (
    props: ReteCustomNodeProps<Scheme>
) => JSX.Element;

