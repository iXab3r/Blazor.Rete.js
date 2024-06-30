import {ClassicPreset, GetSchemes, NodeId} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";
import {ReactArea2D} from "rete-react-plugin";
import { ContextMenuExtra } from "rete-context-menu-plugin";
import {$nodeheight, $nodewidth} from "./vars";

const reteSocket = new ClassicPreset.Socket("socket");

export type Position = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type ReteRectangle = { x: number; y: number; width: number; height: number };
export type RetePoint = { x: number; y: number; };

export enum ReteNodeAutoSizeMode { 
    None,
    Width,
    Height,
    WidthAndHeight
}

export interface ReteNodePosition {
    id?: string;
    x?: number;
    y?: number;
}

export interface ReteNodeConnectionParams {
    connectionId: string;
    sourceNodeId: string; 
    targetNodeId: string;
}

export interface ReteNodeExtraParams {
    
}

export interface ReteNodeParams {
    label?: string;
    id?: string;
    maxInputs?: number;
    maxOutputs?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    autoSize?: ReteNodeAutoSizeMode;
    extraParams: ReteNodeExtraParams;
}

export class ReteNode extends ClassicPreset.Node implements ReteNodeParams{
    
    private readonly _inputSocket: ClassicPreset.Input<ClassicPreset.Socket>;
    private readonly _outputSocket: ClassicPreset.Output<ClassicPreset.Socket>;
    private readonly _inputKey: string = "I";
    private readonly _outputKey: string = "O";
    private readonly _editorId: string;

    private _extraParams: ReteNodeExtraParams;
    private _maxOutputs: number;
    private _maxInputs: number;
    private _width: number = $nodewidth;
    private _height: number = $nodeheight;
    private _autoSize: ReteNodeAutoSizeMode;

    constructor(editorId: string, nodeParams: ReteNodeParams) {
        super(nodeParams.label);
        this._editorId = editorId;
        this.updateParams(nodeParams);
    }
    
    get autoSize() : ReteNodeAutoSizeMode{
        return this._autoSize;
    }
    
    get extraParams(): ReteNodeExtraParams{
        return this._extraParams;
    }

    get width() : number{
        return this._width;
    }

    get height() : number {
        return this._height;
    }

    set width(value: number) {
        this._width = value;
    }

    set height(value: number) {
        this._height = value;
    }
    
    get editorId() : string{
        return this._editorId;
    }

    get maxInputs() : number {
        return this._maxInputs;
    }

    set maxInputs(value: number){
        if (value === this._maxInputs){
            return;
        }
        this._maxInputs = value;
        super.removeInput(this._inputKey);
        if (value > 1) {
            super.addInput(this._inputKey, new ClassicPreset.Input(reteSocket, undefined, true));
        } else if (value === 1) {
            super.addInput(this._inputKey, new ClassicPreset.Input(reteSocket, undefined, false));
        }
    }
    
    get maxOutputs() : number {
        return this._maxOutputs;
    }

    set maxOutputs(value: number){
        if (value === this._maxOutputs){
            return;
        }
        this._maxOutputs = value;
        super.removeOutput(this._outputKey);
        if (value > 1) {
            super.addOutput(this._outputKey, new ClassicPreset.Output(reteSocket, undefined, true));
        } else if (value === 1) {
            super.addOutput(this._outputKey, new ClassicPreset.Output(reteSocket, undefined, false));
        }
    }

    get inputKey(): string {
        return this._inputKey;
    }

    get outputKey(): string {
        return this._outputKey;
    }

    get inputSocket(): ClassicPreset.Input<ClassicPreset.Socket> {
        return this._inputSocket;
    }

    get outputSocket(): ClassicPreset.Output<ClassicPreset.Socket> {
        return this._outputSocket;
    }

    public getParams(): ReteNodeParams {
        return {
            id: this.id,
            label: this.label,
            maxInputs: this._maxInputs,
            maxOutputs: this._maxOutputs,
            width: this._width,
            height: this._height,
            autoSize: this._autoSize,
            extraParams: this._extraParams
        };
    }
    
    public updateParams(nodeParams: ReteNodeParams): boolean {
        let changedPropertiesCount = 0;
        if (nodeParams.id !== null && nodeParams.id !== undefined && this.id !== nodeParams.id) {
            this.id = nodeParams.id;
            changedPropertiesCount++;
        }

        if (nodeParams.label !== null && nodeParams.label !== undefined && this.label !== nodeParams.label) {
            this.label = nodeParams.label;
            changedPropertiesCount++;
        }

        if (nodeParams.width !== null && nodeParams.width !== undefined && this.width !== nodeParams.width) {
            this.width = nodeParams.width;
            changedPropertiesCount++;
        }

        if (nodeParams.height !== null && nodeParams.height !== undefined && this.height !== nodeParams.height) {
            this.height = nodeParams.height;
            changedPropertiesCount++;
        }

        if (nodeParams.maxOutputs !== null && nodeParams.maxOutputs !== undefined && this.maxOutputs !== nodeParams.maxOutputs) {
            this.maxOutputs = nodeParams.maxOutputs;
            changedPropertiesCount++;
        }

        if (nodeParams.maxInputs !== null && nodeParams.maxInputs !== undefined && this.maxInputs !== nodeParams.maxInputs) {
            this.maxInputs = nodeParams.maxInputs;
            changedPropertiesCount++;
        } 
        
        if (nodeParams.autoSize !== null && nodeParams.autoSize !== undefined && this._autoSize !== nodeParams.autoSize) {
            this._autoSize = nodeParams.autoSize;
            changedPropertiesCount++;
        }

        if (nodeParams.extraParams !== null && nodeParams.extraParams !== undefined && this._extraParams !== nodeParams.extraParams) {
            this._extraParams = nodeParams.extraParams;
            changedPropertiesCount++;
        }
        
        return changedPropertiesCount > 0;
    }
}

export class ReteConnection<N extends ReteNode> extends ClassicPreset.Connection<N, N> {
    isMagnetic?: boolean
} 

export type NodeExtraData = { 
    width?: number; 
    height?: number;
    scale?: number;
    autoSize?: ReteNodeAutoSizeMode;
    selected: boolean;
    editorId: string;
    extraParams: ReteNodeExtraParams;
};

export type ConnectionExtraData = { 
    isActive?: boolean, 
    isLoop?: boolean 
};

export type ReteNodeSchemes = ReteNode;
export type ReteConnectionSchemes = ReteConnection<ReteNodeSchemes>;
export type Schemes = GetSchemes<ReteNodeSchemes, ReteConnectionSchemes>;
export type AreaExtra = ReactArea2D<Schemes> | ContextMenuExtra;

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

export interface SelectableNodesAdapter {
    select: (nodeId: NodeId, accumulate: boolean) => void;
    unselect: (nodeId: NodeId) => void;
}
