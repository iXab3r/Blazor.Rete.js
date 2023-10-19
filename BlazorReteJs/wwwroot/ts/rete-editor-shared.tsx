import {ClassicPreset, GetSchemes} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";

const reteSocket = new ClassicPreset.Socket("socket");

export class ReteNodeScheme extends ClassicPreset.Node {
    
    width: number = 180;
    height: number = 90;
    isActive: boolean;
    showSockets: boolean;
    
    private readonly _inputSocket: ClassicPreset.Input<ClassicPreset.Socket>;
    private readonly _outputSocket: ClassicPreset.Output<ClassicPreset.Socket>;

    constructor(label: string) {
        super(label);
        
        this._inputSocket = new ClassicPreset.Input(reteSocket, undefined, true);
        this._outputSocket = new ClassicPreset.Output(reteSocket, undefined, true);
        this.addOutput("O", this._outputSocket);
        this.addInput("I", this._inputSocket);
    }

    get inputSocket(): ClassicPreset.Input<ClassicPreset.Socket> {
        return this._inputSocket;
    }

    get outputSocket(): ClassicPreset.Output<ClassicPreset.Socket> {
        return this._outputSocket;
    }
}

export class ReteConnectionScheme<N extends ReteNodeScheme> extends ClassicPreset.Connection<N, N> {}

export type NodeExtraData = { 
    width?: number; 
    height?: number;
    isBusy: boolean;
    isActive: boolean;
    selected: boolean;
    showSockets: boolean;
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

