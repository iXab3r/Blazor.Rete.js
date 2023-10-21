import {ClassicPreset, GetSchemes} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";
import {ReactArea2D} from "rete-react-plugin";
import { ContextMenuExtra } from "rete-context-menu-plugin";

const reteSocket = new ClassicPreset.Socket("socket");

export interface ReteNodeParams {
    label: string;
    labelPrefix: string;
    labelSuffix: string;
    id?: string;
    maxInputs?: number;
    maxOutputs?: number;
    isActive?: boolean;
    isBusy?: boolean;
}

export class ReteNodeScheme extends ClassicPreset.Node {
    
    width: number = 180;
    height: number = 90;
    isActive: boolean;
    isBusy: boolean;
    labelSuffix: string;
    labelPrefix: string;
    
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

        if (nodeParams.isActive !== null && nodeParams.isActive !== undefined && this.isActive !== nodeParams.isActive) {
            this.isActive = nodeParams.isActive;
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

export class ReteConnectionScheme<N extends ReteNodeScheme> extends ClassicPreset.Connection<N, N> {}

export type NodeExtraData = { 
    width?: number; 
    height?: number;
    isBusy: boolean;
    labelSuffix: string;
    labelPrefix: string;
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

