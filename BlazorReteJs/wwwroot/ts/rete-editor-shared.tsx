import {ClassicPreset, GetSchemes, NodeId} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";
import {ReactArea2D} from "rete-react-plugin";
import { ContextMenuExtra } from "rete-context-menu-plugin";
import {$nodeheight, $nodewidth, $socketmargin, $socketsize} from "./vars";

const reteSocket = new ClassicPreset.Socket("socket");

export type Position = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

export enum ReteNodeStatus {
    None,
    Success,
    Danger,
    Warning,
}

export interface ReteNodePosition {
    id?: string;
    x?: number;
    y?: number;
}

export interface ReteNodeParams {
    label?: string;
    labelPrefix?: string;
    labelSuffix?: string;
    id?: string;
    maxInputs?: number;
    maxOutputs?: number;
    status?: ReteNodeStatus;
    isBusy?: boolean;
    body?: string;
    x?: number;
    y?: number;
}

export class ReteNode extends ClassicPreset.Node {
    
    width: number = $nodewidth;
    height: number = $nodeheight;
    status: ReteNodeStatus;
    isBusy: boolean;
    labelSuffix: string;
    labelPrefix: string;
    body: string;
    
    private readonly _inputSocket: ClassicPreset.Input<ClassicPreset.Socket>;
    private readonly _outputSocket: ClassicPreset.Output<ClassicPreset.Socket>;
    private readonly _inputKey: string = "I";
    private readonly _outputKey: string = "O";
    
    private _maxOutputs: number;
    private _maxInputs: number;

    constructor(nodeParams: ReteNodeParams) {
        super(nodeParams.label);
        this.updateParams(nodeParams);
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
            labelPrefix: this.labelPrefix,
            labelSuffix: this.labelSuffix,
            status: this.status,
            isBusy: this.isBusy,
            body: this.body,
            maxInputs: this._maxInputs,
            maxOutputs: this._maxOutputs,
        };
    }
    
    public updateParams(nodeParams: ReteNodeParams): boolean {
        let changedPropertiesCount = 0;
        if (nodeParams.id !== null && nodeParams.id !== undefined && this.id !== nodeParams.id) {
            this.id = nodeParams.id;
            changedPropertiesCount++;
        }

        if (nodeParams.body !== null && nodeParams.body !== undefined && this.body !== nodeParams.body) {
            this.body = nodeParams.body;
            changedPropertiesCount++;
        }

        if (nodeParams.label !== null && nodeParams.label !== undefined && this.label !== nodeParams.label) {
            this.label = nodeParams.label;
            changedPropertiesCount++;
        }

        if (nodeParams.labelPrefix !== null && nodeParams.labelPrefix !== undefined && this.labelPrefix !== nodeParams.labelPrefix) {
            this.labelPrefix = nodeParams.labelPrefix;
            changedPropertiesCount++;
        }

        if (nodeParams.labelSuffix !== null && nodeParams.labelSuffix !== undefined && this.labelSuffix !== nodeParams.labelSuffix) {
            this.labelSuffix = nodeParams.labelSuffix;
            changedPropertiesCount++;
        }

        if (nodeParams.isBusy !== null && nodeParams.isBusy !== undefined && this.isBusy !== nodeParams.isBusy) {
            this.isBusy = nodeParams.isBusy;
            changedPropertiesCount++;
        }

        if (nodeParams.status !== null && nodeParams.status !== undefined && this.status !== nodeParams.status) {
            this.status = nodeParams.status;
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
    isBusy: boolean;
    body?: string;
    labelSuffix?: string;
    labelPrefix?: string;
    selected: boolean;
    status: ReteNodeStatus;
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
