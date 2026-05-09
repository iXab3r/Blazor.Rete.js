import {ClassicPreset, GetSchemes, NodeId} from "rete";
import {ClassicScheme, Presets, RenderEmit} from "rete-react-plugin";
import {ReactArea2D} from "rete-react-plugin";
import { ContextMenuExtra } from "rete-context-menu-plugin";
import {$nodeheight, $nodewidth, $socketmargin, $socketsize} from "./vars";

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
    id: string;
    sourceNodeId: string;
    sourcePinId: string;
    targetNodeId: string;
    targetPinId: string;
    family?: string;
    order?: number;
}

export type RetePinFamily = "route" | "value" | string;
export type RetePinDirection = "input" | "output";
export type RetePinSide = "top" | "right" | "bottom" | "left" | "auto";

export interface RetePinParams {
    id: string;
    name?: string;
    family: RetePinFamily;
    direction: RetePinDirection;
    side?: RetePinSide;
    valueTypeId?: string;
    maxConnections?: number;
    description?: string;
    tooltip?: string;
    isPrimary?: boolean;
    isAdvanced?: boolean;
    menuOrder?: number;
    coordinateTypeId?: string;
    compatibleValueTypeIds?: string[];
    previewValue?: unknown;
    previewText?: string;
    previewChangedAt?: string;
    isEvaluating?: boolean;
    flowState?: string;
    pinRole?: string;
}

export interface ReteNodeExtraParams {

}

export interface ReteBlazorHostDescriptor {
    componentIdentifier?: string;
    includeDefaultNodeParameters?: boolean;
    parameters?: Record<string, unknown>;
}

export interface ReteNodeParams {
    label?: string;
    id?: string;
    maxInputs?: number;
    maxOutputs?: number;
    pins?: RetePinParams[];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    autoSize?: ReteNodeAutoSizeMode;
    extraParams?: ReteNodeExtraParams;
    blazorHost?: ReteBlazorHostDescriptor;
}

const legacyRouteInputPin: RetePinParams = {
    id: "route-in",
    name: "Route input",
    family: "route",
    direction: "input",
    side: "top"
};

const legacyRouteOutputPin: RetePinParams = {
    id: "route-out",
    name: "Route output",
    family: "route",
    direction: "output",
    side: "bottom"
};

export function normalizeRetePin(pin: RetePinParams): RetePinParams {
    return {
        ...pin,
        family: pin.family || "route",
        direction: pin.direction === "output" ? "output" : "input"
    };
}

export function getPinTooltip(pin?: RetePinParams): string | undefined {
    if (!pin) {
        return undefined;
    }

    return pin.tooltip || pin.description || pin.name || pin.id;
}

export function getPinDisplayName(pin?: RetePinParams): string | undefined {
    if (!pin) {
        return undefined;
    }

    return pin.name || pin.id;
}

export function getPinSide(pin?: RetePinParams): Exclude<RetePinSide, "auto"> {
    if (pin?.side && pin.side !== "auto") {
        return pin.side;
    }

    if (pin?.family === "route") {
        return pin.direction === "output" ? "bottom" : "top";
    }

    return pin?.direction === "output" ? "right" : "left";
}

export function getPinSideAnchorPosition(
    position: RetePoint,
    pinSide: Exclude<RetePinSide, "auto">
): RetePoint {
    const offset = ($socketsize + $socketmargin * 2) / 2;
    switch (pinSide) {
        case "left":
            return {x: position.x - offset, y: position.y};
        case "right":
            return {x: position.x + offset, y: position.y};
        case "bottom":
            return {x: position.x, y: position.y + offset};
        case "top":
        default:
            return {x: position.x, y: position.y - offset};
    }
}

export function createSideAwareConnectionPathPoints(
    points: RetePoint[],
    sourceSide: Exclude<RetePinSide, "auto">,
    targetSide: Exclude<RetePinSide, "auto">,
    curvature: number = 0.3
): RetePoint[] {
    if (points.length !== 2) {
        throw new Error("number of points should be equal to 2");
    }

    const [start, end] = points;
    const xDistance = Math.abs(start.x - end.x);
    const yDistance = Math.abs(start.y - end.y);
    const sourceVector = getPinSideVector(sourceSide);
    const targetVector = getPinSideVector(targetSide);
    const sourceOffset = getConnectionPathOffset(sourceSide, xDistance, yDistance, curvature);
    const targetOffset = getConnectionPathOffset(targetSide, xDistance, yDistance, curvature);

    return [
        start,
        {
            x: start.x + sourceVector.x * sourceOffset,
            y: start.y + sourceVector.y * sourceOffset
        },
        {
            x: end.x + targetVector.x * targetOffset,
            y: end.y + targetVector.y * targetOffset
        },
        end
    ];
}

const minimumConnectionPathLead = $socketsize + $socketmargin * 2;

type CubicConnectionCurveContext = {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
    closePath(): void;
};

class CubicConnectionCurve {
    private readonly points: RetePoint[] = [];

    constructor(private readonly context: CubicConnectionCurveContext) {
    }

    areaStart(): void {
    }

    areaEnd(): void {
    }

    lineStart(): void {
        this.points.length = 0;
    }

    lineEnd(): void {
        if (this.points.length <= 0) {
            return;
        }

        const [start] = this.points;
        this.context.moveTo(start.x, start.y);

        if (this.points.length === 4) {
            const [, sourceControl, targetControl, end] = this.points;
            this.context.bezierCurveTo(
                sourceControl.x,
                sourceControl.y,
                targetControl.x,
                targetControl.y,
                end.x,
                end.y);
            return;
        }

        this.points.slice(1).forEach(point => this.context.lineTo(point.x, point.y));
    }

    point(x: number, y: number): void {
        this.points.push({x, y});
    }
}

export function cubicBezierConnectionCurveFactory(context: CubicConnectionCurveContext): CubicConnectionCurve {
    return new CubicConnectionCurve(context);
}

function getPinSideVector(pinSide: Exclude<RetePinSide, "auto">): RetePoint {
    switch (pinSide) {
        case "left":
            return {x: -1, y: 0};
        case "right":
            return {x: 1, y: 0};
        case "bottom":
            return {x: 0, y: 1};
        case "top":
        default:
            return {x: 0, y: -1};
    }
}

function getConnectionPathOffset(
    pinSide: Exclude<RetePinSide, "auto">,
    xDistance: number,
    yDistance: number,
    curvature: number
): number {
    const offset = pinSide === "left" || pinSide === "right"
        ? Math.max(yDistance / 2, xDistance) * curvature
        : Math.max(xDistance / 2, yDistance) * curvature;

    return Math.max(offset, minimumConnectionPathLead);
}

export function getPinCssToken(value?: string): string | undefined {
    if (!value) {
        return undefined;
    }

    const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return normalized || undefined;
}

export type ReteOutputLauncherOption = {
    key: string;
    pin: RetePinParams;
    index?: number;
};

export type ReteOutputLauncherMenuRow = {
    index: number;
    key: string;
    pinId: string;
    pinName: string;
    label: string;
    title: string;
    isPrimary?: boolean;
    isAdvanced?: boolean;
    valueTypeId?: string;
    coordinateTypeId?: string;
    previewValue?: unknown;
    previewChangedAt?: string;
    previewText?: string;
};

export type ReteOutputLauncherMenuController<T extends ReteOutputLauncherOption = ReteOutputLauncherOption> = {
    rows: ReteOutputLauncherMenuRow[];
    select: (index: number) => T | undefined;
    cancel: (reason?: string) => void;
};

export type ReteOutputLauncherMenuControllerOptions<T extends ReteOutputLauncherOption = ReteOutputLauncherOption> = {
    select: (option: T, row: ReteOutputLauncherMenuRow) => void;
    close: (reason: string, selected: boolean) => void;
};

export type ReteOutputLauncherMenuSelectionCallbacks<T extends ReteOutputLauncherOption = ReteOutputLauncherOption> = {
    select: (option: T, row: ReteOutputLauncherMenuRow) => void;
    close?: (reason: string, selected: boolean) => void;
};

export type ReteOutputLauncherArmDetail = {
    nodeId: string;
    pinId: string;
};

export const reteOutputLauncherArmEventName = "rete-output-launcher-arm";

export function createReteOutputLauncherArmEvent(detail: ReteOutputLauncherArmDetail): CustomEvent<ReteOutputLauncherArmDetail> {
    return new CustomEvent(reteOutputLauncherArmEventName, {
        bubbles: true,
        detail
    });
}

export function isCompactOutputLauncherPin(pin?: RetePinParams): boolean {
    return pin?.family === "value" && pin.direction === "output";
}

export function getOrderedReteOutputLauncherOptions<T extends ReteOutputLauncherOption>(options: T[]): T[] {
    return [...options].sort(compareReteOutputLauncherOptions);
}

export function getPrimaryReteOutputLauncherOption<T extends ReteOutputLauncherOption>(options: T[]): T | undefined {
    const orderedOptions = getOrderedReteOutputLauncherOptions(options);
    return orderedOptions.find(option => option.pin.isPrimary) ?? orderedOptions[0];
}

export function getReteOutputLauncherOptionByMenuIndex<T extends ReteOutputLauncherOption>(
    options: T[],
    index: number
): T | undefined {
    return getOrderedReteOutputLauncherOptions(options)[index];
}

export function createReteOutputLauncherMenuRows<T extends ReteOutputLauncherOption>(
    options: T[]
): ReteOutputLauncherMenuRow[] {
    return getOrderedReteOutputLauncherOptions(options).map((option, index) => {
        const pinName = getPinDisplayName(option.pin) ?? option.pin.id;
        const valueType = option.pin.valueTypeId ? `, ${option.pin.valueTypeId}` : "";
        const coordinateType = option.pin.coordinateTypeId ? `, ${option.pin.coordinateTypeId}` : "";

        return {
            index,
            key: option.key,
            pinId: option.pin.id,
            pinName,
            label: pinName,
            title: `${pinName} (${option.pin.id}${valueType}${coordinateType})`,
            isPrimary: option.pin.isPrimary,
            isAdvanced: option.pin.isAdvanced,
            valueTypeId: option.pin.valueTypeId,
            coordinateTypeId: option.pin.coordinateTypeId
        };
    });
}

export function getPinPreviewText(pin: RetePinParams): string | undefined {
    const valueText = pin.previewText ?? getPreviewValueText(pin.previewValue);
    return [
        valueText,
        pin.previewChangedAt
    ].filter(Boolean).join(" - ") || undefined;
}

function getPreviewValueText(value: unknown): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return undefined;
}

export function createReteOutputLauncherMenuController<T extends ReteOutputLauncherOption>(
    options: T[],
    callbacks: ReteOutputLauncherMenuControllerOptions<T>
): ReteOutputLauncherMenuController<T> {
    const orderedOptions = getOrderedReteOutputLauncherOptions(options);
    const rows = createReteOutputLauncherMenuRows(orderedOptions);
    let closed = false;

    function close(reason: string, selected: boolean): void {
        if (closed) {
            return;
        }

        closed = true;
        callbacks.close(reason, selected);
    }

    return {
        rows,
        select(index: number): T | undefined {
            if (closed) {
                return undefined;
            }

            return selectReteOutputLauncherMenuOption(orderedOptions, index, {
                select: callbacks.select,
                close
            });
        },
        cancel(reason: string = "cancel"): void {
            close(reason, false);
        }
    };
}

export function selectReteOutputLauncherMenuOption<T extends ReteOutputLauncherOption>(
    options: T[],
    index: number,
    callbacks: ReteOutputLauncherMenuSelectionCallbacks<T>
): T | undefined {
    const orderedOptions = getOrderedReteOutputLauncherOptions(options);
    const rows = createReteOutputLauncherMenuRows(orderedOptions);
    const option = orderedOptions[index];
    const row = rows[index];
    if (!option || !row) {
        return undefined;
    }

    callbacks.select(option, row);
    callbacks.close?.("selected", true);
    return option;
}

export function handleReteOutputLauncherMenuPointerDown(
    event: Pick<PointerEvent, "button" | "preventDefault" | "stopPropagation">,
    index: number,
    selectByIndex: (index: number) => void
): boolean {
    if (event.button !== 0) {
        return false;
    }

    event.preventDefault();
    event.stopPropagation();
    selectByIndex(index);
    return true;
}

export function handleReteOutputLauncherMenuClick(
    event: Pick<MouseEvent, "detail" | "preventDefault" | "stopPropagation">,
    index: number,
    selectByIndex: (index: number) => void
): boolean {
    event.preventDefault();
    event.stopPropagation();
    if (event.detail !== 0) {
        return false;
    }

    selectByIndex(index);
    return true;
}

function compareReteOutputLauncherOptions(
    left: ReteOutputLauncherOption,
    right: ReteOutputLauncherOption
): number {
    const advanced = Number(Boolean(left.pin.isAdvanced)) - Number(Boolean(right.pin.isAdvanced));
    if (advanced !== 0) {
        return advanced;
    }

    const leftOrder = left.pin.menuOrder ?? left.index ?? 0;
    const rightOrder = right.pin.menuOrder ?? right.index ?? 0;
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }

    const leftIndex = left.index ?? 0;
    const rightIndex = right.index ?? 0;
    if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
    }

    return left.pin.id.localeCompare(right.pin.id);
}

export class RetePinSocket extends ClassicPreset.Socket {
    public pin: RetePinParams;

    constructor(pin: RetePinParams) {
        const normalizedPin = normalizeRetePin(pin);
        super(getPinTooltip(normalizedPin) || normalizedPin.id);
        this.pin = normalizedPin;
    }
}

export function isRetePinSocket(socket?: ClassicPreset.Socket): socket is RetePinSocket {
    return socket instanceof RetePinSocket || !!(socket as RetePinSocket | undefined)?.pin;
}

export function getSocketPin(socket?: ClassicPreset.Socket): RetePinParams | undefined {
    if (!socket || !isRetePinSocket(socket)) {
        return undefined;
    }

    return socket.pin;
}

export class ReteNode extends ClassicPreset.Node implements ReteNodeParams{
    private readonly _inputKey: string = "route-in";
    private readonly _outputKey: string = "route-out";
    private readonly _editorId: string;

    private _extraParams: ReteNodeExtraParams = {};
    private _maxOutputs: number = 0;
    private _maxInputs: number = 0;
    private _width: number = $nodewidth;
    private _height: number = $nodeheight;
    private _autoSize: ReteNodeAutoSizeMode = ReteNodeAutoSizeMode.None;
    private _blazorHost?: ReteBlazorHostDescriptor;
    private _pins?: RetePinParams[];
    private _pinStructuralSignature?: string;
    private _pinMetadataSignature?: string;
    private _usesExplicitPins: boolean = false;

    constructor(editorId: string, nodeParams: ReteNodeParams) {
        super(nodeParams.label || "");
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

    get blazorHost(): ReteBlazorHostDescriptor | undefined {
        return this._blazorHost;
    }

    get pins(): RetePinParams[] | undefined {
        return this._pins;
    }

    get maxInputs() : number {
        return this._maxInputs;
    }

    set maxInputs(value: number){
        if (value === this._maxInputs){
            return;
        }

        this._maxInputs = value;
        if (!this._usesExplicitPins) {
            this.rebuildLegacyInput();
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
        if (!this._usesExplicitPins) {
            this.rebuildLegacyOutput();
        }
    }

    get inputKey(): string {
        return Object.keys(this.inputs)[0] ?? this._inputKey;
    }

    get outputKey(): string {
        return Object.keys(this.outputs)[0] ?? this._outputKey;
    }

    get inputSocket(): ClassicPreset.Input<ClassicPreset.Socket> | undefined {
        return this.inputs[this.inputKey];
    }

    get outputSocket(): ClassicPreset.Output<ClassicPreset.Socket> | undefined {
        return this.outputs[this.outputKey];
    }

    public getParams(): ReteNodeParams {
        return {
            id: this.id,
            label: this.label,
            maxInputs: this._maxInputs,
            maxOutputs: this._maxOutputs,
            pins: this._pins ? [...this._pins] : undefined,
            width: this._width,
            height: this._height,
            autoSize: this._autoSize,
            extraParams: this._extraParams,
            blazorHost: this._blazorHost
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

        if (nodeParams.pins !== null && nodeParams.pins !== undefined) {
            if (this.updateExplicitPins(nodeParams.pins)) {
                changedPropertiesCount++;
            }

            if (nodeParams.maxOutputs !== null && nodeParams.maxOutputs !== undefined && this._maxOutputs !== nodeParams.maxOutputs) {
                this._maxOutputs = nodeParams.maxOutputs;
                changedPropertiesCount++;
            }

            if (nodeParams.maxInputs !== null && nodeParams.maxInputs !== undefined && this._maxInputs !== nodeParams.maxInputs) {
                this._maxInputs = nodeParams.maxInputs;
                changedPropertiesCount++;
            }
        } else {
            if (this._usesExplicitPins) {
                this._usesExplicitPins = false;
                this._pins = undefined;
                this._pinStructuralSignature = undefined;
                this._pinMetadataSignature = undefined;
                this.clearInputsAndOutputs();
                this.rebuildLegacyInput();
                this.rebuildLegacyOutput();
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
        }

        if (nodeParams.autoSize !== null && nodeParams.autoSize !== undefined && this._autoSize !== nodeParams.autoSize) {
            this._autoSize = nodeParams.autoSize;
            changedPropertiesCount++;
        }

        if (nodeParams.extraParams !== null && nodeParams.extraParams !== undefined && this._extraParams !== nodeParams.extraParams) {
            this._extraParams = nodeParams.extraParams;
            changedPropertiesCount++;
        }

        if (nodeParams.blazorHost !== null && nodeParams.blazorHost !== undefined && this._blazorHost !== nodeParams.blazorHost) {
            this._blazorHost = nodeParams.blazorHost;
            changedPropertiesCount++;
        }

        return changedPropertiesCount > 0;
    }

    private updateExplicitPins(pins: RetePinParams[]): boolean {
        const normalizedPins = pins
            .filter(pin => !!pin?.id)
            .map(normalizeRetePin);
        const structuralSignature = this.getPinsStructuralSignature(normalizedPins);
        const metadataSignature = this.getPinsMetadataSignature(normalizedPins);

        if (this._usesExplicitPins && this._pinStructuralSignature === structuralSignature) {
            if (this._pinMetadataSignature === metadataSignature) {
                return false;
            }

            this._pins = normalizedPins;
            this._pinMetadataSignature = metadataSignature;
            this.updateExplicitPinMetadata(normalizedPins);
            return true;
        }

        this._usesExplicitPins = true;
        this._pins = normalizedPins;
        this._pinStructuralSignature = structuralSignature;
        this._pinMetadataSignature = metadataSignature;
        this.clearInputsAndOutputs();
        this.rebuildExplicitPins(normalizedPins);
        return true;
    }

    private updateExplicitPinMetadata(pins: RetePinParams[]): void {
        pins.forEach(pin => {
            const socket = pin.direction === "input"
                ? this.inputs[pin.id]?.socket
                : this.outputs[pin.id]?.socket;
            if (isRetePinSocket(socket)) {
                socket.pin = pin;
            }
        });
    }

    private rebuildExplicitPins(pins: RetePinParams[]): void {
        pins.forEach((pin, index) => {
            const portIndex = pin.menuOrder ?? index;
            if (pin.direction === "input") {
                const input = new ClassicPreset.Input(new RetePinSocket(pin), getPinDisplayName(pin), this.allowsMultipleInputConnections(pin));
                input.index = portIndex;
                super.addInput(pin.id, input);
            } else {
                const output = new ClassicPreset.Output(new RetePinSocket(pin), getPinDisplayName(pin), this.allowsMultipleOutputConnections(pin));
                output.index = portIndex;
                super.addOutput(pin.id, output);
            }
        });
    }

    private rebuildLegacyInput(): void {
        super.removeInput(this._inputKey);
        if (this._maxInputs > 1) {
            const input = new ClassicPreset.Input(new RetePinSocket({...legacyRouteInputPin, maxConnections: this._maxInputs}), undefined, true);
            super.addInput(this._inputKey, input);
        } else if (this._maxInputs === 1) {
            super.addInput(this._inputKey, new ClassicPreset.Input(new RetePinSocket(legacyRouteInputPin), undefined, false));
        }
    }

    private rebuildLegacyOutput(): void {
        super.removeOutput(this._outputKey);
        if (this._maxOutputs > 1) {
            const output = new ClassicPreset.Output(new RetePinSocket({...legacyRouteOutputPin, maxConnections: this._maxOutputs}), undefined, true);
            super.addOutput(this._outputKey, output);
        } else if (this._maxOutputs === 1) {
            super.addOutput(this._outputKey, new ClassicPreset.Output(new RetePinSocket(legacyRouteOutputPin), undefined, false));
        }
    }

    private allowsMultipleInputConnections(pin: RetePinParams): boolean {
        return (pin.maxConnections ?? 1) > 1;
    }

    private allowsMultipleOutputConnections(pin: RetePinParams): boolean {
        return pin.maxConnections !== 1;
    }

    private clearInputsAndOutputs(): void {
        Object.keys(this.inputs).forEach(key => super.removeInput(key));
        Object.keys(this.outputs).forEach(key => super.removeOutput(key));
    }

    private getPinsStructuralSignature(pins: RetePinParams[]): string {
        return JSON.stringify(pins.map(pin => ({
            id: pin.id,
            name: pin.name,
            family: pin.family,
            direction: pin.direction,
            side: pin.side,
            valueTypeId: pin.valueTypeId,
            maxConnections: pin.maxConnections,
            description: pin.description,
            tooltip: pin.tooltip,
            isPrimary: pin.isPrimary,
            isAdvanced: pin.isAdvanced,
            menuOrder: pin.menuOrder,
            coordinateTypeId: pin.coordinateTypeId,
            compatibleValueTypeIds: pin.compatibleValueTypeIds
        })));
    }

    private getPinsMetadataSignature(pins: RetePinParams[]): string {
        return JSON.stringify(pins.map(pin => ({
            id: pin.id,
            previewValue: pin.previewValue,
            previewText: pin.previewText,
            previewChangedAt: pin.previewChangedAt,
            isEvaluating: pin.isEvaluating,
            flowState: pin.flowState,
            pinRole: pin.pinRole
        })));
    }
}

export class ReteConnection<N extends ReteNode> extends ClassicPreset.Connection<N, N> {
    family?: string;
    order?: number;
    isMagnetic?: boolean

    constructor(
        source: N,
        sourceOutput: keyof N["outputs"],
        target: N,
        targetInput: keyof N["inputs"],
        params?: Pick<ReteNodeConnectionParams, "family" | "order">) {
        super(source, sourceOutput, target, targetInput);
        this.family = params?.family;
        this.order = params?.order;
    }
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
    isLoop?: boolean,
    family?: string,
    order?: number
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
