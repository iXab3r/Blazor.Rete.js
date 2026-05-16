import { ClassicPreset, NodeEditor } from "rete";
import { Area2D, AreaPlugin } from "rete-area-plugin";
import {
    ConnectionPlugin,
    SocketData,
    createPseudoconnection,
    getSourceTarget
} from "rete-connection-plugin";
import type { Context, Flow, PickParams } from "rete-connection-plugin";
import { getElementCenter } from "rete-render-utils";
import {
    createSideAwareConnectionPathPoints,
    getPinDisplayName,
    getPinPreviewText,
    getPinSide,
    getPinSideAnchorPosition,
    getSocketPin,
    normalizeRetePin,
    Position,
    ReteConnection,
    ReteNodeSchemes,
    reteOutputLauncherArmEventName,
    ReteOutputLauncherArmDetail,
    RetePinSide,
    RetePinParams,
    RetePoint,
    Schemes
} from "../rete-editor-shared";
import { findNearestPoint, isInsideRect, getNodeRect } from "../scaffolding/utils";

export type ReteSocketData = SocketData & {
    pin?: RetePinParams;
    payload?: unknown;
};

type Props = {
    createConnection: (from: ReteSocketData, to: ReteSocketData) => Promise<void>;
    display: (from: ReteSocketData, to: ReteSocketData) => boolean;
    offset: (socket: ReteSocketData, position: Position) => Position;
    margin?: number;
    distance?: number;
};

export type RetePinCompatibilityResult = {
    compatible: boolean;
    replacement?: boolean;
    preferred?: boolean;
    reason?: string;
};

export type RetePinCompatibilityContext = {
    sourceConnectionCount?: number;
    targetConnectionCount?: number;
    allowInputReplacement?: boolean;
};

type SocketPair = {
    source: ReteSocketData;
    target: ReteSocketData;
    sourcePin: RetePinParams;
    targetPin: RetePinParams;
};

export type MagneticConnectionPathMetadata = {
    isMagnetic?: true;
    sourceNodeId?: string;
    sourcePinId?: string;
    sourcePinSide?: Exclude<RetePinSide, "auto">;
    targetNodeId?: string;
    targetPinId?: string;
    targetPinSide?: Exclude<RetePinSide, "auto">;
};

export type RetePinPairCandidate = {
    sourceNodeId: string;
    sourceNodeLabel?: string;
    sourcePinId: string;
    sourcePinName?: string;
    targetNodeId: string;
    targetNodeLabel?: string;
    targetPinId: string;
    targetPinName?: string;
    family?: string;
    valueTypeId?: string;
    coordinateTypeId?: string;
    replacement?: boolean;
    preferred?: boolean;
    reason?: string;
};

export type ReteSocketPairCandidate = SocketPair & {
    initial: ReteSocketData;
    candidate: ReteSocketData;
    compatibility: RetePinCompatibilityResult;
    detail: RetePinPairCandidate;
};

export type RetePinPairDropResolution =
    | { kind: "none"; candidates: ReteSocketPairCandidate[] }
    | { kind: "single"; candidate: ReteSocketPairCandidate; candidates: ReteSocketPairCandidate[] }
    | { kind: "multiple"; candidates: ReteSocketPairCandidate[] };

export type RetePinPairPickerReason = "ambiguous-node-body-drop" | "no-compatible-node-body-drop";

export type RetePinPairPickerDetail = {
    requestId: number;
    editorId?: string;
    initialNodeId: string;
    initialPinId: string;
    targetNodeIds: string[];
    candidates: RetePinPairCandidate[];
    position?: Position;
    reason: RetePinPairPickerReason;
};

export type RetePinPairPickerCancelDetail = {
    requestId: number;
    editorId?: string;
    reason: string;
};

export type RetePinPairPickerRow = {
    index: number;
    label: string;
    title: string;
    sourceNodeId: string;
    sourcePinId: string;
    targetNodeId: string;
    targetPinId: string;
    replacement?: boolean;
    preferred?: boolean;
};

export type RetePinPairPickerController = {
    rows: RetePinPairPickerRow[];
    select: (index: number) => Promise<boolean>;
    cancel: (reason?: string) => void;
};

export type RetePinPairPickerControllerOptions = {
    createConnection: (from: ReteSocketData, to: ReteSocketData) => Promise<void>;
    close: (reason: string, dispatchCancel: boolean) => void;
};

export type PendingConnectionLabelDetail = {
    label: string;
    title: string;
    nodeId: string;
    nodeLabel?: string;
    pinId: string;
    pinName: string;
    direction: "input" | "output";
    family: string;
    valueTypeId?: string;
    coordinateTypeId?: string;
    sourceNodeId?: string;
    sourceNodeLabel?: string;
    sourcePinId?: string;
    sourcePinName?: string;
    targetNodeId?: string;
    targetNodeLabel?: string;
    targetPinId?: string;
    targetPinName?: string;
    targetDirection?: "input" | "output";
    compatibility?: "compatible" | "incompatible" | "neutral";
    compatibilityReason?: string;
    warningText?: string;
    previewValue?: unknown;
    previewText?: string;
    previewChangedAt?: string;
};

export const retePinPairPickerEventName = "rete-pin-pair-picker";
export const retePinPairPickerCancelEventName = "rete-pin-pair-picker-cancel";

const compatibilityClasses = [
    "rete-pin-compatible",
    "rete-pin-incompatible",
    "rete-pin-nearest",
    "rete-pin-replacement",
    "rete-pin-picked"
];

const connectionStateClasses = [
    "rete-pin-connected"
];

const socketRevealClasses = [
    "rete-pin-connected",
    "rete-pin-picked",
    "rete-pin-compatible",
    "rete-pin-nearest",
    "rete-pin-replacement"
];

const nodeCompatibilityClasses = [
    "rete-node-compatible",
    "rete-node-incompatible",
    "rete-node-picked"
];

const compatibilityAttributeNames = [
    "data-pin-compatibility",
    "data-pin-compatibility-reason",
    "data-pin-replacement",
    "data-pin-preferred",
    "data-pin-disabled",
    "aria-disabled"
];

const connectionStateAttributeNames = [
    "data-pin-connected"
];

const nodeCompatibilityAttributeNames = [
    "data-node-compatibility",
    "data-node-disabled",
    "aria-disabled"
];

const rejectedConnectionFeedbackTimeoutMs = 3500;

export type ClickToArmConnectionFlowParams<S extends Schemes> = {
    makeConnection: <K extends any[]>(from: SocketData, to: SocketData, context: Context<S, K>) => boolean | undefined | Promise<boolean | undefined>;
};

export class ClickToArmConnectionFlow<S extends Schemes, K extends any[] = any[]> implements Flow<S, K> {
    private pickedSocket: SocketData | undefined;
    private detachReleaseSocket: SocketData | undefined;

    constructor(private readonly params: ClickToArmConnectionFlowParams<S>) {
    }

    public async pick(params: PickParams, context: Context<S, K>): Promise<void> {
        if (!this.pickedSocket) {
            if (params.event === "down") {
                await this.pickInitialSocket(params.socket, context);
            }
            return;
        }

        if (params.event === "up" && this.detachReleaseSocket) {
            const releaseSocket = this.detachReleaseSocket;
            this.detachReleaseSocket = undefined;
            if (isSameSocket(releaseSocket, params.socket)) {
                return;
            }
        }

        if (isSameSocket(this.pickedSocket, params.socket)) {
            return;
        }

        const initial = this.pickedSocket;
        if (await this.params.makeConnection(initial, params.socket, context)) {
            this.pickedSocket = undefined;
            await context.scope.emit({
                type: "connectiondrop",
                data: {
                    initial,
                    socket: params.socket,
                    created: true
                }
            });
            return;
        }

        await context.scope.emit({
            type: "connectionreject",
            data: {
                initial,
                socket: params.socket,
                created: false
            }
        } as any);
    }

    public getPickedSocket(): SocketData | undefined {
        return this.pickedSocket;
    }

    public drop(_context: Context<S, K>): void {
        // Empty pointer-up is also how area panning ends. Keep the socket armed;
        // explicit cancel gestures call cancel instead.
    }

    public async arm(socket: SocketData, context: Context<S, K>): Promise<boolean> {
        await this.pickInitialSocket(socket, context);
        return Boolean(this.pickedSocket);
    }

    public async cancel(context: Context<S, K>, _reason: string = "cancel"): Promise<void> {
        const initial = this.pickedSocket;
        if (!initial) {
            return;
        }

        this.pickedSocket = undefined;
        await context.scope.emit({
            type: "connectiondrop",
            data: {
                initial,
                socket: null,
                created: false
            }
        });
    }

    private async pickInitialSocket(socket: SocketData, context: Context<S, K>): Promise<void> {
        if (isSocketConcealed(hydrateReteSocketData(socket))) {
            return;
        }

        const detached = await this.tryDetachExistingInputConnection(socket, context);
        if (detached) {
            return;
        }

        if (await context.scope.emit({type: "connectionpick", data: {socket}})) {
            this.pickedSocket = socket;
        }
    }

    private async tryDetachExistingInputConnection(socket: SocketData, context: Context<S, K>): Promise<boolean> {
        if (socket.side !== "input") {
            return false;
        }

        if (isSocketConcealed(hydrateReteSocketData(socket))) {
            return false;
        }

        const connection = context.editor.getConnections()
            .find(item => item.target === socket.nodeId && item.targetInput === socket.key);
        if (!connection) {
            return false;
        }

        const outputSocket = Array.from(context.socketsCache.values())
            .find(item =>
                item.nodeId === connection.source &&
                item.side === "output" &&
                item.key === connection.sourceOutput);
        if (!outputSocket) {
            return false;
        }

        const removed = await context.editor.removeConnection(connection.id);
        if (!removed) {
            return true;
        }

        if (await context.scope.emit({type: "connectionpick", data: {socket: outputSocket}})) {
            this.pickedSocket = outputSocket;
            this.detachReleaseSocket = socket;
        }

        return true;
    }
}

function isSameSocket(left: SocketData, right: SocketData): boolean {
    return left.nodeId === right.nodeId &&
        left.side === right.side &&
        left.key === right.key;
}

export function getPinConnectionLimit(pin: RetePinParams): number | undefined {
    if (pin.maxConnections !== null && pin.maxConnections !== undefined && pin.maxConnections > 0) {
        return pin.maxConnections;
    }

    return pin.direction === "input" ? 1 : undefined;
}

export function evaluatePinCompatibility(
    sourcePin: RetePinParams,
    targetPin: RetePinParams,
    context: RetePinCompatibilityContext = {}
): RetePinCompatibilityResult {
    if (sourcePin.direction !== "output" || targetPin.direction !== "input") {
        return {compatible: false, reason: "direction"};
    }

    if (sourcePin.family !== targetPin.family) {
        return {compatible: false, reason: "family"};
    }

    const sourceLimit = getPinConnectionLimit(sourcePin);
    if (sourceLimit !== undefined && (context.sourceConnectionCount ?? 0) >= sourceLimit) {
        return {compatible: false, reason: "source-cardinality"};
    }

    if (sourcePin.coordinateTypeId && targetPin.coordinateTypeId && sourcePin.coordinateTypeId !== targetPin.coordinateTypeId) {
        return {compatible: false, reason: "coordinate-type"};
    }

    if (sourcePin.valueTypeId && targetPin.valueTypeId && sourcePin.valueTypeId !== targetPin.valueTypeId) {
        const targetAcceptsSource = targetPin.compatibleValueTypeIds?.includes(sourcePin.valueTypeId);
        const sourceAcceptsTarget = sourcePin.compatibleValueTypeIds?.includes(targetPin.valueTypeId);
        if (!targetAcceptsSource && !sourceAcceptsTarget) {
            return {compatible: false, reason: "value-type"};
        }
    }

    const targetLimit = getPinConnectionLimit(targetPin);
    if (targetLimit !== undefined && (context.targetConnectionCount ?? 0) >= targetLimit) {
        if (targetPin.direction === "input" && targetLimit === 1 && context.allowInputReplacement !== false) {
            return {
                compatible: true,
                replacement: true,
                preferred: targetPin.isPrimary,
                reason: "target-input-replacement"
            };
        }

        return {compatible: false, reason: "target-cardinality"};
    }

    return {
        compatible: true,
        preferred: targetPin.isPrimary
    };
}

export function hydrateReteSocketData(socket: ReteSocketData | SocketData): ReteSocketData {
    const socketData = socket as ReteSocketData;
    const pin = socketData.pin ?? getSocketPin(socketData.payload as ClassicPreset.Socket | undefined);

    return pin
        ? {...socketData, pin}
        : socketData;
}

export function getSocketPinMetadata(socket: ReteSocketData): RetePinParams {
    const socketData = hydrateReteSocketData(socket);
    if (socketData.pin) {
        return normalizeRetePin(socketData.pin);
    }

    return normalizeRetePin({
        id: socketData.key,
        name: socketData.key,
        family: "route",
        direction: socketData.side,
        side: socketData.side === "output" ? "bottom" : "top"
    });
}

export function getCanonicalSocketPair(from: ReteSocketData, to: ReteSocketData): SocketPair | undefined {
    const sourceTarget = getSourceTarget(hydrateReteSocketData(from), hydrateReteSocketData(to));
    if (!sourceTarget) {
        return undefined;
    }

    const [source, target] = sourceTarget as [ReteSocketData, ReteSocketData];
    return {
        source,
        target,
        sourcePin: getSocketPinMetadata(source),
        targetPin: getSocketPinMetadata(target)
    };
}

export function createMagneticConnectionPathMetadata(
    from: ReteSocketData,
    to: ReteSocketData
): MagneticConnectionPathMetadata | undefined {
    const pair = getCanonicalSocketPair(from, to);
    if (!pair) {
        return undefined;
    }

    return {
        isMagnetic: true,
        sourceNodeId: pair.source.nodeId,
        sourcePinId: pair.source.key,
        sourcePinSide: getPinSide(pair.sourcePin),
        targetNodeId: pair.target.nodeId,
        targetPinId: pair.target.key,
        targetPinSide: getPinSide(pair.targetPin)
    };
}

export function applyMagneticConnectionPathMetadata(
    target: MagneticConnectionPathMetadata,
    from?: ReteSocketData,
    to?: ReteSocketData
): void {
    delete target.sourceNodeId;
    delete target.sourcePinId;
    delete target.sourcePinSide;
    delete target.targetNodeId;
    delete target.targetPinId;
    delete target.targetPinSide;
    target.isMagnetic = true;

    if (!from || !to) {
        return;
    }

    const metadata = createMagneticConnectionPathMetadata(from, to);
    if (metadata) {
        Object.assign(target, metadata);
    }
}

export function createMagneticPreviewConnectionPathPoints(
    points: RetePoint[],
    from: ReteSocketData,
    to: ReteSocketData
): RetePoint[] {
    const metadata = createMagneticConnectionPathMetadata(from, to);
    if (!metadata?.sourcePinSide || !metadata.targetPinSide) {
        throw new Error("Magnetic preview path requires opposite-direction socket endpoints");
    }

    return createSideAwareConnectionPathPoints(points, metadata.sourcePinSide, metadata.targetPinSide);
}

function isSameNodePair(pair: SocketPair): boolean {
    return pair.source.nodeId === pair.target.nodeId;
}

export function evaluateSocketCompatibility(
    from: ReteSocketData,
    to: ReteSocketData,
    context: RetePinCompatibilityContext = {}
): RetePinCompatibilityResult {
    const pair = getCanonicalSocketPair(from, to);
    if (!pair) {
        return {compatible: false, reason: "direction"};
    }

    if (isSameNodePair(pair)) {
        return {compatible: false, reason: "same-node"};
    }

    return evaluatePinCompatibility(pair.sourcePin, pair.targetPin, context);
}

export function evaluateSocketCompatibilityForEditor<S extends Schemes>(
    editor: NodeEditor<S>,
    from: ReteSocketData,
    to: ReteSocketData
): RetePinCompatibilityResult {
    const pair = getCanonicalSocketPair(from, to);
    if (!pair) {
        return {compatible: false, reason: "direction"};
    }

    if (isSameNodePair(pair)) {
        return {compatible: false, reason: "same-node"};
    }

    return evaluatePinCompatibility(pair.sourcePin, pair.targetPin, {
        sourceConnectionCount: countConnections(editor, pair.source, pair.sourcePin),
        targetConnectionCount: countConnections(editor, pair.target, pair.targetPin)
    });
}

export function createReteConnectionFromSockets<S extends Schemes>(
    editor: NodeEditor<S>,
    from: ReteSocketData | SocketData,
    to: ReteSocketData | SocketData
): boolean | undefined {
    const connection = createReteConnectionForSockets(editor, from, to);
    if (!connection) {
        return undefined;
    }

    void editor.addConnection(connection);

    return true;
}

export async function createReteConnectionFromSocketsAndWait<S extends Schemes>(
    editor: NodeEditor<S>,
    from: ReteSocketData | SocketData,
    to: ReteSocketData | SocketData
): Promise<S["Connection"] | undefined> {
    const connection = createReteConnectionForSockets(editor, from, to);
    if (!connection) {
        return undefined;
    }

    return await editor.addConnection(connection) ? connection : undefined;
}

export function findExactConnectionForSockets<S extends Schemes>(
    editor: NodeEditor<S>,
    from: ReteSocketData | SocketData,
    to: ReteSocketData | SocketData
): S["Connection"] | undefined {
    const pair = getCanonicalSocketPair(hydrateReteSocketData(from), hydrateReteSocketData(to));
    if (!pair) {
        return undefined;
    }

    return editor.getConnections().find(connection =>
        connection.source === pair.source.nodeId &&
        connection.sourceOutput === pair.source.key &&
        connection.target === pair.target.nodeId &&
        connection.targetInput === pair.target.key);
}

function createReteConnectionForSockets<S extends Schemes>(
    editor: NodeEditor<S>,
    from: ReteSocketData | SocketData,
    to: ReteSocketData | SocketData
): S["Connection"] | undefined {
    const pair = getCanonicalSocketPair(hydrateReteSocketData(from), hydrateReteSocketData(to));
    if (!pair) {
        return undefined;
    }

    const compatibility = evaluateSocketCompatibilityForEditor(editor, pair.source, pair.target);
    if (!compatibility.compatible) {
        return undefined;
    }

    if (hasExactConnection(editor, pair)) {
        return undefined;
    }

    const sourceNode = editor.getNode(pair.source.nodeId) as ReteNodeSchemes;
    const targetNode = editor.getNode(pair.target.nodeId) as ReteNodeSchemes;
    const family = pair.sourcePin.family === pair.targetPin.family ? pair.sourcePin.family : undefined;

    const connection = new ReteConnection<ReteNodeSchemes>(
        sourceNode,
        pair.source.key as never,
        targetNode,
        pair.target.key as never,
        {family}
    );
    if (!connection.id) {
        connection.id = createClientConnectionId();
    }

    return connection as S["Connection"];
}

function createClientConnectionId(): string {
    return `rete-connection-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function hasExactConnection<S extends Schemes>(editor: NodeEditor<S>, pair: SocketPair): boolean {
    return editor.getConnections().some(connection =>
        connection.source === pair.source.nodeId &&
        connection.sourceOutput === pair.source.key &&
        connection.target === pair.target.nodeId &&
        connection.targetInput === pair.target.key);
}

export function getCompatibleSocketPairCandidates<S extends Schemes>(
    initial: ReteSocketData,
    candidates: ReteSocketData[],
    editor: NodeEditor<S>
): ReteSocketPairCandidate[] {
    return candidates
        .filter(candidate => isSocketCandidateAvailableForGesture(initial, candidate, editor))
        .map(candidate => toSocketPairCandidate(initial, candidate, editor))
        .filter((candidate): candidate is ReteSocketPairCandidate => !!candidate)
        .filter(candidate => candidate.compatibility.compatible)
        .sort(compareSocketPairCandidates);
}

export function resolveCompatibleSocketPairDrop<S extends Schemes>(
    initial: ReteSocketData,
    candidates: ReteSocketData[],
    editor: NodeEditor<S>
): RetePinPairDropResolution {
    const compatibleCandidates = getCompatibleSocketPairCandidates(initial, candidates, editor);

    if (compatibleCandidates.length === 1) {
        return {
            kind: "single",
            candidate: compatibleCandidates[0],
            candidates: compatibleCandidates
        };
    }

    if (compatibleCandidates.length > 1) {
        return {
            kind: "multiple",
            candidates: compatibleCandidates
        };
    }

    return {
        kind: "none",
        candidates: compatibleCandidates
    };
}

function toSocketPairCandidate<S extends Schemes>(
    initial: ReteSocketData,
    candidate: ReteSocketData,
    editor: NodeEditor<S>
): ReteSocketPairCandidate | undefined {
    const initialSocket = hydrateReteSocketData(initial);
    const candidateSocket = hydrateReteSocketData(candidate);
    const pair = getCanonicalSocketPair(initialSocket, candidateSocket);
    if (!pair) {
        return undefined;
    }

    const compatibility = isSameNodePair(pair)
        ? {compatible: false, reason: "same-node"}
        : evaluatePinCompatibility(pair.sourcePin, pair.targetPin, {
            sourceConnectionCount: countConnections(editor, pair.source, pair.sourcePin),
            targetConnectionCount: countConnections(editor, pair.target, pair.targetPin)
        });

    return {
        ...pair,
        initial: initialSocket,
        candidate: candidateSocket,
        compatibility,
        detail: createPinPairCandidateDetail(editor, pair, compatibility)
    };
}

function createPinPairCandidateDetail<S extends Schemes>(
    editor: NodeEditor<S>,
    pair: SocketPair,
    compatibility: RetePinCompatibilityResult
): RetePinPairCandidate {
    const sourceNode = editor.getNode(pair.source.nodeId) as ReteNodeSchemes | undefined;
    const targetNode = editor.getNode(pair.target.nodeId) as ReteNodeSchemes | undefined;

    return {
        sourceNodeId: pair.source.nodeId,
        sourceNodeLabel: sourceNode?.label,
        sourcePinId: pair.sourcePin.id,
        sourcePinName: getPinDisplayName(pair.sourcePin),
        targetNodeId: pair.target.nodeId,
        targetNodeLabel: targetNode?.label,
        targetPinId: pair.targetPin.id,
        targetPinName: getPinDisplayName(pair.targetPin),
        family: pair.sourcePin.family === pair.targetPin.family ? pair.sourcePin.family : undefined,
        valueTypeId: pair.targetPin.valueTypeId ?? pair.sourcePin.valueTypeId,
        coordinateTypeId: pair.targetPin.coordinateTypeId ?? pair.sourcePin.coordinateTypeId,
        replacement: compatibility.replacement,
        preferred: compatibility.preferred,
        reason: compatibility.reason
    };
}

function compareSocketPairCandidates(left: ReteSocketPairCandidate, right: ReteSocketPairCandidate): number {
    const preferred = Number(Boolean(right.compatibility.preferred)) - Number(Boolean(left.compatibility.preferred));
    if (preferred !== 0) {
        return preferred;
    }

    const replacement = Number(Boolean(left.compatibility.replacement)) - Number(Boolean(right.compatibility.replacement));
    if (replacement !== 0) {
        return replacement;
    }

    const leftOrder = (left.sourcePin.menuOrder ?? 0) + (left.targetPin.menuOrder ?? 0);
    const rightOrder = (right.sourcePin.menuOrder ?? 0) + (right.targetPin.menuOrder ?? 0);
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }

    return `${left.detail.sourceNodeId}:${left.detail.sourcePinId}->${left.detail.targetNodeId}:${left.detail.targetPinId}`
        .localeCompare(`${right.detail.sourceNodeId}:${right.detail.sourcePinId}->${right.detail.targetNodeId}:${right.detail.targetPinId}`);
}

export function createPinPairPickerRows(
    candidates: Array<ReteSocketPairCandidate | RetePinPairCandidate>
): RetePinPairPickerRow[] {
    return candidates.map((candidate, index) => {
        const detail = getPinPairCandidateDetail(candidate);
        const sourcePinLabel = detail.sourcePinName || detail.sourcePinId;
        const targetPinLabel = detail.targetPinName || detail.targetPinId;
        const sourceNodeLabel = detail.sourceNodeLabel || detail.sourceNodeId;
        const targetNodeLabel = detail.targetNodeLabel || detail.targetNodeId;

        return {
            index,
            label: `${sourcePinLabel} -> ${targetPinLabel}`,
            title: `${sourceNodeLabel}:${sourcePinLabel} (${detail.sourcePinId}) -> ${targetNodeLabel}:${targetPinLabel} (${detail.targetPinId})`,
            sourceNodeId: detail.sourceNodeId,
            sourcePinId: detail.sourcePinId,
            targetNodeId: detail.targetNodeId,
            targetPinId: detail.targetPinId,
            replacement: detail.replacement,
            preferred: detail.preferred
        };
    });
}

export function createPinPairPickerSelectionController(
    candidates: ReteSocketPairCandidate[],
    options: RetePinPairPickerControllerOptions
): RetePinPairPickerController {
    const rows = createPinPairPickerRows(candidates);
    let closed = false;

    function close(reason: string, dispatchCancel: boolean): void {
        if (closed) {
            return;
        }

        closed = true;
        options.close(reason, dispatchCancel);
    }

    return {
        rows,
        async select(index: number): Promise<boolean> {
            if (closed) {
                return false;
            }

            const candidate = candidates[index];
            if (!candidate) {
                return false;
            }

            try {
                await options.createConnection(candidate.initial, candidate.candidate);
            } finally {
                close("selected", false);
            }

            return true;
        },
        cancel(reason: string = "cancel"): void {
            close(reason, true);
        }
    };
}

function getPinPairCandidateDetail(
    candidate: ReteSocketPairCandidate | RetePinPairCandidate
): RetePinPairCandidate {
    return "detail" in candidate
        ? candidate.detail
        : candidate;
}

type ReteAreaTransform = Position & { k: number };

type PinPairPickerMenuHandle = {
    element: HTMLElement;
    close: () => void;
};

type ActivePinPairPickerState = {
    requestId: number;
    editorId?: string;
    candidates: ReteSocketPairCandidate[];
    menu?: PinPairPickerMenuHandle;
};

type PendingConnectionLabelHandle = {
    element: HTMLElement;
    update: (
        socket: ReteSocketData,
        position?: Position,
        target?: ReteSocketData,
        compatibility?: RetePinCompatibilityResult,
        warningText?: string
    ) => void;
    close: () => void;
};

type RejectedConnectionFeedbackHandle = {
    element: HTMLElement;
    close: () => void;
};

type PinPairPickerMenuOptions = {
    requestId: number;
    editorId?: string;
    container: HTMLElement;
    position: Position;
    transform: ReteAreaTransform;
    controller: RetePinPairPickerController;
};

function createPinPairPickerMenu(options: PinPairPickerMenuOptions): PinPairPickerMenuHandle | undefined {
    if (options.controller.rows.length === 0) {
        return undefined;
    }

    const ownerDocument = options.container.ownerDocument;
    if (!ownerDocument?.body) {
        return undefined;
    }

    const menu = ownerDocument.createElement("div");
    const buttons: HTMLButtonElement[] = [];

    menu.className = "rete-pin-pair-picker";
    menu.setAttribute("role", "menu");
    menu.setAttribute("data-request-id", String(options.requestId));
    if (options.editorId) {
        menu.setAttribute("data-editor-id", options.editorId);
    }

    Object.assign(menu.style, {
        position: "fixed",
        zIndex: "2147483647",
        minWidth: "180px",
        maxWidth: "320px",
        maxHeight: "min(260px, calc(100vh - 16px))",
        overflowY: "auto",
        padding: "4px",
        borderRadius: "6px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        background: "rgba(24, 24, 27, 0.98)",
        color: "#f8fafc",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
        font: "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        pointerEvents: "auto"
    });

    menu.addEventListener("pointerdown", event => event.stopPropagation());
    menu.addEventListener("click", event => event.stopPropagation());

    options.controller.rows.forEach(row => {
        const button = ownerDocument.createElement("button");
        button.type = "button";
        button.className = "rete-pin-pair-picker__row";
        button.textContent = row.label;
        button.title = row.title;
        button.setAttribute("role", "menuitem");
        button.setAttribute("data-index", String(row.index));
        button.setAttribute("data-source-node-id", row.sourceNodeId);
        button.setAttribute("data-source-pin-id", row.sourcePinId);
        button.setAttribute("data-target-node-id", row.targetNodeId);
        button.setAttribute("data-target-pin-id", row.targetPinId);
        if (row.replacement) {
            button.setAttribute("data-pin-replacement", "true");
        }
        if (row.preferred) {
            button.setAttribute("data-pin-preferred", "true");
        }

        Object.assign(button.style, {
            display: "block",
            width: "100%",
            minHeight: "28px",
            padding: "6px 8px",
            border: "0",
            borderRadius: "4px",
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
            textAlign: "left",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            font: "inherit"
        });

        const setActive = (active: boolean) => {
            button.style.background = active ? "rgba(125, 211, 252, 0.16)" : "transparent";
        };

        button.addEventListener("mouseenter", () => setActive(true));
        button.addEventListener("mouseleave", () => setActive(false));
        button.addEventListener("focus", () => setActive(true));
        button.addEventListener("blur", () => setActive(false));
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            button.disabled = true;
            options.controller.select(row.index).catch(error => {
                button.disabled = false;
                console.error(error);
            });
        });

        buttons.push(button);
        menu.appendChild(button);
    });

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") {
            return;
        }

        event.preventDefault();
        options.controller.cancel("escape");
    };

    const onOutsidePointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (target && menu.contains(target)) {
            return;
        }

        options.controller.cancel("outside-pointerdown");
    };

    ownerDocument.addEventListener("keydown", onKeyDown, true);
    ownerDocument.addEventListener("pointerdown", onOutsidePointerDown, true);
    ownerDocument.body.appendChild(menu);
    placePinPairPickerMenu(menu, editorToClientPosition(options.position, options.container, options.transform));
    buttons[0]?.focus();

    return {
        element: menu,
        close() {
            ownerDocument.removeEventListener("keydown", onKeyDown, true);
            ownerDocument.removeEventListener("pointerdown", onOutsidePointerDown, true);
            menu.remove();
        }
    };
}

function editorToClientPosition(
    position: Position,
    container: HTMLElement,
    transform: ReteAreaTransform
): Position {
    const rect = container.getBoundingClientRect();

    return {
        x: rect.left + transform.x + position.x * transform.k,
        y: rect.top + transform.y + position.y * transform.k
    };
}

function placePinPairPickerMenu(menu: HTMLElement, clientPosition: Position): void {
    const view = menu.ownerDocument.defaultView;
    const margin = 8;
    let left = clientPosition.x + margin;
    let top = clientPosition.y + margin;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    if (!view) {
        return;
    }

    const rect = menu.getBoundingClientRect();
    const maxLeft = Math.max(margin, view.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, view.innerHeight - rect.height - margin);

    left = Math.min(Math.max(left, margin), maxLeft);
    top = Math.min(Math.max(top, margin), maxTop);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

export function createPendingConnectionLabelDetail(socket: ReteSocketData, nodeLabel?: string): PendingConnectionLabelDetail {
    return createPendingConnectionLabelDetailForState(socket, () => nodeLabel);
}

function createPendingConnectionLabelDetailForState(
    socket: ReteSocketData,
    getNodeLabel: (socket: ReteSocketData) => string | undefined,
    target?: ReteSocketData,
    compatibility?: RetePinCompatibilityResult,
    warningText?: string
): PendingConnectionLabelDetail {
    const pin = getSocketPinMetadata(socket);
    const pinName = getPinDisplayName(pin) ?? pin.id;
    const readableNodeLabel = formatNodeDisplayName(getNodeLabel(socket), socket.nodeId);
    const pair = target ? getCanonicalSocketPair(socket, target) : undefined;
    const source = pair?.source ?? (pin.direction === "output" ? socket : undefined);
    const sourcePin = pair?.sourcePin ?? (pin.direction === "output" ? pin : undefined);
    const targetSocket = pair?.target ?? (pin.direction === "input" ? socket : undefined);
    const targetPin = pair?.targetPin ?? (pin.direction === "input" ? pin : undefined);
    const sourceNodeLabel = source ? formatNodeDisplayName(getNodeLabel(source), source.nodeId) : readableNodeLabel;
    const targetNodeLabel = targetSocket ? formatNodeDisplayName(getNodeLabel(targetSocket), targetSocket.nodeId) : undefined;
    const sourcePinName = sourcePin ? getPinDisplayName(sourcePin) ?? sourcePin.id : pinName;
    const targetPinName = targetPin ? getPinDisplayName(targetPin) ?? targetPin.id : undefined;
    const previewPin = sourcePin ?? pin;
    const previewText = getPinPreviewText(previewPin);
    const status = compatibility
        ? (compatibility.compatible ? "compatible" : "incompatible")
        : "neutral";
    const label = source && targetSocket
        ? `${sourceNodeLabel} -> ${targetNodeLabel}`
        : pin.direction === "output"
            ? `${readableNodeLabel} ->`
            : `-> ${readableNodeLabel}`;
    const previewLabel = getPinPreviewLabel(previewPin);
    const warning = warningText ?? (compatibility && !compatibility.compatible
        ? getConnectionWarningText(compatibility.reason, sourceNodeLabel, sourcePinName, targetNodeLabel, targetPinName)
        : undefined);

    return {
        label,
        title: [label, previewLabel, warning].filter(Boolean).join(" "),
        nodeId: socket.nodeId,
        nodeLabel: readableNodeLabel,
        pinId: pin.id,
        pinName,
        direction: pin.direction,
        family: pin.family,
        valueTypeId: pin.valueTypeId,
        coordinateTypeId: pin.coordinateTypeId,
        sourceNodeId: source?.nodeId,
        sourceNodeLabel,
        sourcePinId: sourcePin?.id,
        sourcePinName,
        targetNodeId: targetSocket?.nodeId,
        targetNodeLabel,
        targetPinId: targetPin?.id,
        targetPinName,
        targetDirection: targetPin?.direction,
        compatibility: status,
        compatibilityReason: compatibility?.reason,
        warningText: warning,
        previewValue: previewPin.previewValue,
        previewText,
        previewChangedAt: previewPin.previewChangedAt
    };
}

function createPendingConnectionLabel(
    container: HTMLElement,
    socket: ReteSocketData,
    getNodeLabel: (socket: ReteSocketData) => string | undefined,
    position?: Position
): PendingConnectionLabelHandle | undefined {
    const ownerDocument = container.ownerDocument;
    if (!ownerDocument?.body) {
        return undefined;
    }

    const element = ownerDocument.createElement("div");
    element.className = "rete-pending-connection-label";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");

    Object.assign(element.style, {
        position: "fixed",
        zIndex: "2147483647",
        padding: "4px 8px",
        borderRadius: "4px",
        border: "1px solid rgba(125, 211, 252, 0.58)",
        borderLeft: "3px solid rgba(125, 211, 252, 0.9)",
        background: "transparent",
        color: "#f8fafc",
        boxShadow: "none",
        font: "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: "16px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        overflow: "visible",
        textAlign: "left"
    });
    element.animate?.(
        [
            {borderLeftColor: "rgba(125, 211, 252, 0.45)"},
            {borderLeftColor: "rgba(125, 211, 252, 1)"}
        ],
        {duration: 900, iterations: Infinity, direction: "alternate"}
    );
    element.setAttribute("data-in-progress", "true");
    element.setAttribute("data-position-anchor", "pane-top-left");

    ownerDocument.body.appendChild(element);

    const handle: PendingConnectionLabelHandle = {
        element,
        update(
            labelSocket: ReteSocketData,
            labelPosition?: Position,
            target?: ReteSocketData,
            compatibility?: RetePinCompatibilityResult,
            warningText?: string
        ) {
            const detail = createPendingConnectionLabelDetailForState(labelSocket, getNodeLabel, target, compatibility, warningText);
            renderPendingConnectionLabelContent(element, detail);
            element.title = detail.title;
            applyPendingConnectionLabelState(element, detail);
            element.setAttribute("data-node-id", detail.nodeId);
            setOptionalAttribute(element, "data-node-label", detail.nodeLabel);
            element.setAttribute("data-pin-id", detail.pinId);
            element.setAttribute("data-pin-name", detail.pinName);
            element.setAttribute("data-pin-direction", detail.direction);
            element.setAttribute("data-pin-family", detail.family);
            setOptionalAttribute(element, "data-value-type-id", detail.valueTypeId);
            setOptionalAttribute(element, "data-coordinate-type-id", detail.coordinateTypeId);
            setOptionalAttribute(element, "data-target-node-id", detail.targetNodeId);
            setOptionalAttribute(element, "data-target-node-label", detail.targetNodeLabel);
            setOptionalAttribute(element, "data-target-pin-id", detail.targetPinId);
            setOptionalAttribute(element, "data-target-pin-name", detail.targetPinName);
            setOptionalAttribute(element, "data-connection-compatibility", detail.compatibility);
            setOptionalAttribute(element, "data-connection-compatibility-reason", detail.compatibilityReason);
            setOptionalAttribute(element, "data-connection-warning", detail.warningText);
            setOptionalAttribute(element, "data-pin-preview-value", formatPreviewDataAttribute(detail.previewValue));
            setOptionalAttribute(element, "data-pin-preview", detail.previewText);
            setOptionalAttribute(element, "data-pin-preview-changed-at", detail.previewChangedAt);
            placePendingConnectionLabel(element, container, labelSocket, labelPosition);
        },
        close() {
            element.remove();
        }
    };

    handle.update(socket, position);
    return handle;
}

function createRejectedConnectionFeedback(
    container: HTMLElement,
    detail: PendingConnectionLabelDetail,
    text: string
): RejectedConnectionFeedbackHandle | undefined {
    const ownerDocument = container.ownerDocument;
    if (!ownerDocument?.body) {
        return undefined;
    }

    const element = ownerDocument.createElement("div");
    element.className = "rete-connection-feedback rete-connection-feedback--warning";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "assertive");
    element.setAttribute("data-connection-feedback", "rejected");
    setOptionalAttribute(element, "data-connection-compatibility", detail.compatibility);
    setOptionalAttribute(element, "data-connection-compatibility-reason", detail.compatibilityReason);
    setOptionalAttribute(element, "data-connection-warning", text);
    setOptionalAttribute(element, "data-source-node-id", detail.sourceNodeId);
    setOptionalAttribute(element, "data-source-node-label", detail.sourceNodeLabel);
    setOptionalAttribute(element, "data-source-pin-id", detail.sourcePinId);
    setOptionalAttribute(element, "data-source-pin-name", detail.sourcePinName);
    setOptionalAttribute(element, "data-target-node-id", detail.targetNodeId);
    setOptionalAttribute(element, "data-target-node-label", detail.targetNodeLabel);
    setOptionalAttribute(element, "data-target-pin-id", detail.targetPinId);
    setOptionalAttribute(element, "data-target-pin-name", detail.targetPinName);

    element.textContent = text;
    element.title = text;
    element.setAttribute("aria-label", text);
    Object.assign(element.style, {
        position: "fixed",
        zIndex: "2147483647",
        padding: "5px 9px",
        borderRadius: "4px",
        border: "1px solid rgba(248, 113, 113, 0.78)",
        borderLeft: "3px solid rgba(248, 113, 113, 1)",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#fecaca",
        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.28)",
        font: "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        lineHeight: "16px",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        textAlign: "left"
    });

    ownerDocument.body.appendChild(element);
    placeRejectedConnectionFeedback(element, container);

    const timeoutHandle = setTimeout(() => element.remove(), rejectedConnectionFeedbackTimeoutMs);
    (timeoutHandle as any)?.unref?.();

    return {
        element,
        close() {
            clearTimeout(timeoutHandle);
            element.remove();
        }
    };
}

function placeRejectedConnectionFeedback(element: HTMLElement, container: HTMLElement): void {
    const view = container.ownerDocument.defaultView;
    const margin = 8;
    const containerRect = container.getBoundingClientRect();
    let left = containerRect.left + margin;
    let top = containerRect.top + 42;

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    if (!view) {
        return;
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(margin, view.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, view.innerHeight - rect.height - margin);

    left = Math.min(Math.max(left, margin), maxLeft);
    top = Math.min(Math.max(top, margin), maxTop);

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

function renderPendingConnectionLabelContent(element: HTMLElement, detail: PendingConnectionLabelDetail): void {
    const ownerDocument = element.ownerDocument;
    const main = ownerDocument.createElement("span");
    const arrow = ownerDocument.createElement("span");
    const children: Array<HTMLElement | string> = [];

    main.className = "rete-pending-connection-label__main";
    arrow.className = "rete-pending-connection-label__arrow";
    Object.assign(main.style, {
        display: "grid",
        gridAutoFlow: "column",
        gridAutoColumns: "max-content",
        alignItems: "start",
        columnGap: "6px"
    });
    Object.assign(arrow.style, {
        alignSelf: "center"
    });

    const sourceEndpoint = createPendingConnectionEndpoint(
        ownerDocument,
        "source",
        detail.sourceNodeLabel ?? detail.nodeLabel ?? detail.nodeId,
        detail.sourcePinName ?? detail.pinName);

    if (detail.targetNodeId) {
        const targetEndpoint = createPendingConnectionEndpoint(
            ownerDocument,
            "target",
            detail.targetNodeLabel ?? formatNodeDisplayName(undefined, detail.targetNodeId),
            detail.targetPinName);
        arrow.textContent = " -> ";
        children.push(sourceEndpoint, arrow, targetEndpoint);
    } else if (detail.direction === "output") {
        arrow.textContent = " ->";
        children.push(sourceEndpoint, arrow);
    } else {
        arrow.textContent = "-> ";
        children.push(arrow, sourceEndpoint);
    }

    main.append(...children);
    const content: HTMLElement[] = [main];

    const previewText = getPendingConnectionPreviewText(detail.previewValue, detail.previewText, detail.previewChangedAt);
    if (previewText) {
        const preview = ownerDocument.createElement("span");
        preview.className = "rete-pending-connection-label__preview";
        preview.textContent = previewText;
        Object.assign(preview.style, {
            display: "block",
            opacity: "0.78",
            fontSize: "11px",
            lineHeight: "14px"
        });
        content.push(preview);
    }

    if (detail.warningText) {
        const warning = ownerDocument.createElement("span");
        warning.className = "rete-pending-connection-label__warning";
        warning.textContent = detail.warningText;
        Object.assign(warning.style, {
            display: "block",
            color: "#fecaca",
            fontSize: "11px",
            lineHeight: "14px"
        });
        content.push(warning);
    }

    element.replaceChildren(...content);
}

function createPendingConnectionEndpoint(
    ownerDocument: Document,
    role: "source" | "target",
    nodeText: string | undefined,
    pinText: string | undefined
): HTMLElement {
    const endpoint = ownerDocument.createElement("span");
    const nodeLabel = ownerDocument.createElement("span");
    const pinLabel = ownerDocument.createElement("span");

    endpoint.className = `rete-pending-connection-label__endpoint rete-pending-connection-label__${role}`;
    nodeLabel.className = `rete-pending-connection-label__node rete-pending-connection-label__${role}-node`;
    pinLabel.className = `rete-pending-connection-label__pin rete-pending-connection-label__${role}-pin`;
    nodeLabel.textContent = nodeText ?? "";
    pinLabel.textContent = pinText ?? "";

    Object.assign(endpoint.style, {
        display: "grid",
        gridTemplateRows: "auto auto",
        alignItems: "start",
        minWidth: "0"
    });
    Object.assign(pinLabel.style, {
        fontSize: "11px",
        fontStyle: "italic",
        lineHeight: "13px",
        opacity: "0.78"
    });

    endpoint.append(nodeLabel, pinLabel);
    return endpoint;
}

function applyPendingConnectionLabelState(element: HTMLElement, detail: PendingConnectionLabelDetail): void {
    switch (detail.compatibility) {
        case "compatible":
            element.style.borderColor = "rgba(34, 197, 94, 0.72)";
            element.style.borderLeftColor = "rgba(34, 197, 94, 1)";
            element.style.color = "#f0fdf4";
            break;
        case "incompatible":
            element.style.borderColor = "rgba(248, 113, 113, 0.75)";
            element.style.borderLeftColor = "rgba(248, 113, 113, 1)";
            element.style.color = "#fecaca";
            break;
        default:
            element.style.borderColor = "rgba(125, 211, 252, 0.58)";
            element.style.borderLeftColor = "rgba(125, 211, 252, 0.9)";
            element.style.color = "#f8fafc";
            break;
    }
}

function getConnectionWarningText(
    reason?: string,
    sourceNodeLabel?: string,
    _sourcePinName?: string,
    targetNodeLabel?: string,
    _targetPinName?: string
): string | undefined {
    const source = formatNodeDisplayName(sourceNodeLabel) || "this node";
    const target = formatNodeDisplayName(targetNodeLabel) || "that node";

    switch (reason) {
        case "same-node":
        case "same-socket":
            return undefined;
        case "family":
            return `You can't connect ${source} to ${target}.`;
        case "direction":
            return "Start from an output and connect to an input.";
        case "coordinate-type":
            return `${source} can't connect to ${target}.`;
        case "value-type":
            return `${source} can't connect to ${target}.`;
        case "source-cardinality":
            return `${source} can't add another connection here.`;
        case "target-cardinality":
            return `${target} already has a connection here.`;
        default:
            return `You can't connect ${source} to ${target}.`;
    }
}

function getRejectedConnectionFeedbackText(
    detail: PendingConnectionLabelDetail,
    reason?: string
): string | undefined {
    if (reason === "same-node" || reason === "same-socket") {
        return undefined;
    }

    if (reason === "direction") {
        return "Start from an output and connect to an input.";
    }

    const source = formatRejectedConnectionEndpoint(detail.sourceNodeLabel, detail.sourcePinName, detail.nodeLabel);
    const target = formatRejectedConnectionEndpoint(detail.targetNodeLabel, detail.targetPinName, detail.targetNodeId);

    switch (reason) {
        case "source-cardinality":
            return `${source} can't add another connection.`;
        case "target-cardinality":
            return `${target} already has a connection.`;
        default:
            return `You can't connect ${source} to ${target}.`;
    }
}

function formatRejectedConnectionEndpoint(
    nodeLabel?: string,
    pinName?: string,
    fallback?: string
): string {
    const node = formatNodeDisplayName(nodeLabel, fallback) || "this node";
    const pin = formatNodeDisplayName(pinName);

    return pin
        ? `${node} ${pin}`
        : node;
}

function getPinPreviewLabel(pin: RetePinParams): string | undefined {
    return getPendingConnectionPreviewText(pin.previewValue, getPinPreviewText(pin), pin.previewChangedAt);
}

function getPendingConnectionPreviewText(previewValue: unknown, previewText?: string, previewChangedAt?: string): string | undefined {
    const value = shortenPreviewText(
        formatPreviewDataAttribute(previewValue) ??
        stripPreviewTimestamp(previewText, previewChangedAt)
    );
    if (!value) {
        return undefined;
    }

    const changedAt = previewChangedAt ? ` (${previewChangedAt})` : "";
    return `Value: ${value}${changedAt}`;
}

function stripPreviewTimestamp(previewText?: string, previewChangedAt?: string): string | undefined {
    if (!previewText || !previewChangedAt) {
        return previewText;
    }

    const suffix = ` - ${previewChangedAt}`;
    return previewText.endsWith(suffix)
        ? previewText.slice(0, -suffix.length)
        : previewText;
}

function shortenPreviewText(text?: string, maxLength: number = 96): string | undefined {
    if (!text) {
        return undefined;
    }

    return text.length > maxLength
        ? `${text.slice(0, maxLength - 3)}...`
        : text;
}

function humanizeIdentifier(value?: string): string {
    if (!value) {
        return "";
    }

    const normalized = value
        .replace(/^JS[-_]/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();
    return normalized || value;
}

function formatNodeDisplayName(label?: string, fallbackId?: string): string {
    const raw = (label?.trim() || humanizeIdentifier(fallbackId)).trim();
    if (!raw) {
        return "";
    }

    const cleaned = raw
        .replace(/\s*#\d+$/g, "")
        .replace(/\s*\(\d+\)$/g, "")
        .replace(/[-_]\d+$/g, "")
        .trim();

    return cleaned || raw;
}

function setOptionalAttribute(element: HTMLElement, name: string, value?: string): void {
    if (value) {
        element.setAttribute(name, value);
    } else {
        element.removeAttribute(name);
    }
}

function formatPreviewDataAttribute(value: unknown): string | undefined {
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

function placePendingConnectionLabel(
    element: HTMLElement,
    container: HTMLElement,
    _socket: ReteSocketData,
    _position?: Position
): void {
    const view = container.ownerDocument.defaultView;
    const margin = 8;
    const containerRect = container.getBoundingClientRect();
    let left = containerRect.left + margin;
    let top = containerRect.top + margin;

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    if (!view) {
        return;
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(margin, view.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, view.innerHeight - rect.height - margin);

    left = Math.min(Math.max(left, margin), maxLeft);
    top = Math.min(Math.max(top, margin), maxTop);

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

export function useMagneticConnectionForEditor<S extends Schemes, K = never>(
    editor: NodeEditor<S>,
    connection: ConnectionPlugin<S, K>,
    connectionFlow?: ClickToArmConnectionFlow<S, any[]>,
    trackConnection?: (connectionId: string) => void){
    
    useMagneticConnection(connection, {
        async createConnection(from, to) {
            const createdConnection = await createReteConnectionFromSocketsAndWait(editor, from, to);
            if (createdConnection) {
                trackConnection?.(createdConnection.id);
            }
        },
        display(from, to) {
            return evaluateSocketCompatibility(from, to).compatible;
        },
        offset(socket, position) {
            return getSocketSideAnchorPosition(socket, position);
        }
    }, connectionFlow);
}

function getSocketSideAnchorPosition(socket: ReteSocketData, position: Position): Position {
    const pinSide = getPinSide(getSocketPinMetadata(socket));
    return getPinSideAnchorPosition(position, pinSide);
}

export function useMagneticConnection<S extends Schemes, K = never>(
    connection: ConnectionPlugin<S, K>,
    props: Props,
    connectionFlow?: ClickToArmConnectionFlow<S, any[]>
) {
    const area = connection.parentScope<AreaPlugin<S, Area2D<S>>>(AreaPlugin);
    const editor = area.parentScope<NodeEditor<S>>(NodeEditor);
    const sockets = new Map<HTMLElement, ReteSocketData>();
    const magneticConnectionMetadata: MagneticConnectionPathMetadata = {
        isMagnetic: true
    };
    const magneticConnection = createPseudoconnection<Schemes, Area2D<S>>(
        magneticConnectionMetadata as Partial<Schemes["Connection"]>
    );
    const margin = typeof props.margin !== "undefined" ? props.margin : 50;
    const distance = typeof props.distance !== "undefined" ? props.distance : 50;

    let picked: null | ReteSocketData = null;
    let nearestSocket: null | (ReteSocketData & Position) = null;
    let lastPointerPosition: Position | undefined;
    let gestureId = 0;
    let pickerRequestId = 0;
    let activePinPairPicker: ActivePinPairPickerState | undefined;
    let pendingConnectionLabel: PendingConnectionLabelHandle | undefined;
    let rejectedConnectionFeedback: RejectedConnectionFeedbackHandle | undefined;
    let pendingLabelTargetSocket: ReteSocketData | undefined;
    let pendingLabelCompatibility: RetePinCompatibilityResult | undefined;
    let pendingLabelWarning: string | undefined;
    let boardPointerDown: { pointerId: number; x: number; y: number; startedOnSocket: boolean } | undefined;

    area.container.addEventListener("pointerdown", onAreaPointerDownCapture, true);
    area.container.addEventListener(reteOutputLauncherArmEventName, onOutputLauncherArm as EventListener);
    area.container.ownerDocument.addEventListener("keydown", onDocumentKeyDown, true);
    area.container.ownerDocument.defaultView?.addEventListener("pointerup", onWindowPointerUpCapture, true);
    area.container.ownerDocument.defaultView?.addEventListener("blur", onWindowBlur, true);

    editor.addPipe(context => {
        if (context.type === "cleared") {
            closeRejectedConnectionFeedback();
            resetTransientState("editor-cleared");
        } else if (context.type === "noderemoved") {
            if (picked?.nodeId === context.data.id) {
                resetTransientState("picked-node-removed");
            } else if (activePickerReferencesNode(context.data.id)) {
                cancelActivePinPairPicker("picker-node-removed");
            }
        } else if (context.type === "connectioncreated" || context.type === "connectionremoved") {
            updateConnectionStateClasses(Array.from(sockets.values()), editor);
        }

        return context;
    });

    (connection as ConnectionPlugin<S, K>).addPipe(async (context) => {
        if (!context || typeof context !== "object" || !("type" in context))
            return context;

        const contextType = (context as any).type;
        const contextData = (context as any).data;
        if (contextType === "connectionpick") {
            const socket = hydrateSocket(contextData.socket);
            startGesture(socket);
            updateCompatibilityClasses(Array.from(sockets.values()), socket, editor);
            updateNodeCompatibilityClasses(Array.from(sockets.values()), socket);
        } else if (contextType === "connectiondrop") {
            const currentGestureId = gestureId;
            const initial = hydrateSocket(contextData.initial);
            let preservePicker = false;

            if (!contextData.created) {
                if (nearestSocket && props.display(initial, nearestSocket)) {
                    await props.createConnection(initial, nearestSocket);
                } else if (contextData.socket) {
                    showConnectionWarning(initial, hydrateSocket(contextData.socket));
                } else if (!contextData.socket) {
                    preservePicker = await handleNodeBodyDrop(initial, lastPointerPosition ?? area.area.pointer, currentGestureId);
                }
            }

            resetTransientState("connectiondrop", {preservePicker});
        } else if (contextType === "connectionreject") {
            const initial = hydrateSocket(contextData.initial);
            const rejectedSocket = hydrateSocket(contextData.socket);
            showConnectionWarning(initial, rejectedSocket);
        } else if (contextType === "pointermove") {
            if (!picked) return context;
            const currentGestureId = gestureId;
            const point = contextData.position;
            lastPointerPosition = point;
            const nodes = Array.from(area.nodeViews.entries());
            const socketsList = Array.from(sockets.values());

            updateCompatibilityClasses(socketsList, picked, editor);
            updateNodeCompatibilityClasses(socketsList, picked);

            const rects = nodes.map(([id, view]) => ({
                id,
                ...getNodeRect(editor.getNode(id), view)
            }));
            const nearestRects = rects.filter((rect) =>
                isInsideRect(rect, point, margin)
            );
            const nearestNodes = nearestRects.map(({ id }) => id);
            const candidateSockets = socketsList
                .filter((item) => nearestNodes.includes(item.nodeId))
                .filter((item) => isSocketCandidateAvailableForGesture(picked!, item, editor));
            const socketsPositions = await Promise.all(
                candidateSockets.map(async (socket) => {
                    const nodeView = area.nodeViews.get(socket.nodeId);

                    if (!nodeView) throw new Error("node view");

                    const { x, y } = await getElementCenter(
                        socket.element,
                        nodeView.element
                    );

                    return {
                        ...socket,
                        x: x + nodeView.position.x,
                        y: y + nodeView.position.y
                    };
                })
            );
            if (currentGestureId !== gestureId || !picked) {
                return context;
            }

            const nearestCandidate = findNearestPoint(socketsPositions, point, distance) || null;
            const nearestCandidateCompatibility = nearestCandidate
                ? getSocketCompatibility(picked, nearestCandidate, editor)
                : undefined;
            nearestSocket = nearestCandidate && nearestCandidateCompatibility?.compatible
                && props.display(picked, nearestCandidate)
                ? nearestCandidate
                : null;
            pendingLabelTargetSocket = nearestCandidate ?? undefined;
            pendingLabelCompatibility = nearestCandidateCompatibility;
            pendingLabelWarning = undefined;
            updateCompatibilityClasses(socketsList, picked, editor, nearestSocket ?? undefined);
            updateNodeCompatibilityClasses(socketsList, picked, nearestSocket ?? nearestCandidate ?? undefined);
            updatePendingConnectionLabel(point);

            if (nearestSocket) {
                if (!magneticConnection.isMounted()) magneticConnection.mount(area);
                const { x, y } = nearestSocket;
                applyMagneticConnectionPathMetadata(magneticConnectionMetadata, picked, nearestSocket);

                magneticConnection.render(
                    area,
                    props.offset(nearestSocket, { x, y }),
                    picked
                );
            } else if (magneticConnection.isMounted()) {
                applyMagneticConnectionPathMetadata(magneticConnectionMetadata);
                magneticConnection.unmount(area);
            }
        } else if (contextType === "render" && contextData.type === "socket") {
            const { element } = contextData;
            const socketData = contextData as SocketData & { payload?: unknown };

            const socket = hydrateReteSocketData(socketData);
            sockets.set(element, socket);
            updateSocketConnectionState(socket, editor);
            if (picked) {
                updateCompatibilityClasses(Array.from(sockets.values()), picked, editor, nearestSocket ?? undefined);
                updateNodeCompatibilityClasses(Array.from(sockets.values()), picked, nearestSocket ?? undefined);
            }
        } else if (contextType === "unmount") {
            const socket = sockets.get(contextData.element);
            if (socket) {
                if (picked?.element === socket.element || nearestSocket?.element === socket.element) {
                    resetTransientState("socket-unmounted");
                } else {
                    if (activePickerReferencesSocket(socket)) {
                        cancelActivePinPairPicker("socket-unmounted");
                    }
                    clearSocketClasses(socket);
                }
            }
            sockets.delete(contextData.element);
        }
        return context;
    });

    function startGesture(socket: ReteSocketData): void {
        cancelActivePinPairPicker("new-connection-gesture");
        closeRejectedConnectionFeedback();
        gestureId++;
        picked = socket;
        nearestSocket = null;
        pendingLabelTargetSocket = undefined;
        pendingLabelCompatibility = undefined;
        pendingLabelWarning = undefined;
        lastPointerPosition = undefined;
        showPendingConnectionLabel(socket);
        updateConnectionStateClasses(Array.from(sockets.values()), editor);
    }

    function resetTransientState(reason: string, options: { preservePicker?: boolean } = {}): void {
        gestureId++;
        picked = null;
        nearestSocket = null;
        pendingLabelTargetSocket = undefined;
        pendingLabelCompatibility = undefined;
        pendingLabelWarning = undefined;
        lastPointerPosition = undefined;
        clearCompatibilityClasses(Array.from(sockets.values()));
        clearNodeCompatibilityClasses();
        updateConnectionStateClasses(Array.from(sockets.values()), editor);
        applyMagneticConnectionPathMetadata(magneticConnectionMetadata);
        magneticConnection.unmount(area);
        closePendingConnectionLabel();

        if (!options.preservePicker) {
            cancelActivePinPairPicker(reason);
        }
    }

    function showPendingConnectionLabel(socket: ReteSocketData): void {
        closePendingConnectionLabel();
        pendingConnectionLabel = createPendingConnectionLabel(area.container, socket, getNodeLabelFromSocket, lastPointerPosition);
    }

    function updatePendingConnectionLabel(position?: Position): void {
        if (!picked || !pendingConnectionLabel) {
            return;
        }

        pendingConnectionLabel.update(picked, position, pendingLabelTargetSocket, pendingLabelCompatibility, pendingLabelWarning);
    }

    function showConnectionWarning(initial: ReteSocketData, rejectedSocket: ReteSocketData): void {
        const compatibility = getSocketCompatibility(initial, rejectedSocket, editor);
        if (compatibility.reason === "same-node" || compatibility.reason === "same-socket") {
            if (picked?.element === initial.element && pendingConnectionLabel) {
                pendingLabelTargetSocket = undefined;
                pendingLabelCompatibility = undefined;
                pendingLabelWarning = undefined;
                updatePendingConnectionLabel(lastPointerPosition);
            }
            return;
        }

        if (picked?.element === initial.element && pendingConnectionLabel) {
            pendingLabelTargetSocket = rejectedSocket;
            pendingLabelCompatibility = compatibility;
            pendingLabelWarning = undefined;
            updateCompatibilityClasses(Array.from(sockets.values()), picked, editor, nearestSocket ?? undefined);
            updateNodeCompatibilityClasses(Array.from(sockets.values()), picked, rejectedSocket);
            updatePendingConnectionLabel(lastPointerPosition);
        }

        showRejectedConnectionFeedback(initial, rejectedSocket, compatibility);
    }

    function closePendingConnectionLabel(): void {
        pendingConnectionLabel?.close();
        pendingConnectionLabel = undefined;
    }

    function showRejectedConnectionFeedback(
        initial: ReteSocketData,
        rejectedSocket: ReteSocketData,
        compatibility: RetePinCompatibilityResult
    ): void {
        const detail = createPendingConnectionLabelDetailForState(
            initial,
            getNodeLabelFromSocket,
            rejectedSocket,
            compatibility);
        const warningText = getRejectedConnectionFeedbackText(detail, compatibility.reason);

        if (!warningText) {
            return;
        }

        closeRejectedConnectionFeedback();
        rejectedConnectionFeedback = createRejectedConnectionFeedback(area.container, detail, warningText);
    }

    function closeRejectedConnectionFeedback(): void {
        rejectedConnectionFeedback?.close();
        rejectedConnectionFeedback = undefined;
    }

    async function handleNodeBodyDrop(
        initial: ReteSocketData,
        point: Position | undefined,
        currentGestureId: number
    ): Promise<boolean> {
        if (!point || currentGestureId !== gestureId) {
            return false;
        }

        const targetNodeIds = getNodeIdsAtPoint(point);
        if (targetNodeIds.length === 0) {
            return false;
        }

        const candidateSockets = Array.from(sockets.values())
            .filter(socket => targetNodeIds.includes(socket.nodeId))
            .filter(socket => isSocketCandidateAvailableForGesture(initial, socket, editor));
        const resolution = resolveCompatibleSocketPairDrop(initial, candidateSockets, editor);

        if (resolution.kind === "single") {
            if (currentGestureId === gestureId) {
                await props.createConnection(initial, resolution.candidate.candidate);
            }

            return false;
        }

        const reason: RetePinPairPickerReason = resolution.kind === "multiple"
            ? "ambiguous-node-body-drop"
            : "no-compatible-node-body-drop";

        dispatchPinPairPicker(initial, targetNodeIds, resolution.candidates, point, reason);
        return true;
    }

    function getNodeIdsAtPoint(point: Position): string[] {
        return Array.from(area.nodeViews.entries())
            .map(([id, view]) => ({
                id,
                ...getNodeRect(editor.getNode(id), view)
            }))
            .filter(rect => isInsideRect(rect, point, 0))
            .map(rect => rect.id);
    }

    function dispatchPinPairPicker(
        initial: ReteSocketData,
        targetNodeIds: string[],
        candidates: ReteSocketPairCandidate[],
        position: Position,
        reason: RetePinPairPickerReason
    ): void {
        cancelActivePinPairPicker("superseded");

        const requestId = ++pickerRequestId;
        const detail: RetePinPairPickerDetail = {
            requestId,
            editorId: getEditorIdFromSocket(initial),
            initialNodeId: initial.nodeId,
            initialPinId: getSocketPinMetadata(initial).id,
            targetNodeIds,
            candidates: candidates.map(candidate => candidate.detail),
            position,
            reason
        };

        activePinPairPicker = {
            requestId,
            editorId: detail.editorId,
            candidates
        };

        let defaultPrevented = false;
        if (typeof CustomEvent !== "undefined") {
            const event = new CustomEvent(retePinPairPickerEventName, {
                bubbles: true,
                cancelable: true,
                detail
            });

            defaultPrevented = !area.container.dispatchEvent(event);
        }

        if (defaultPrevented || reason !== "ambiguous-node-body-drop" || candidates.length === 0) {
            return;
        }

        const controller = createPinPairPickerSelectionController(candidates, {
            createConnection: props.createConnection,
            close: (closeReason, dispatchCancel) => closeActivePinPairPicker(requestId, closeReason, dispatchCancel)
        });
        const menu = createPinPairPickerMenu({
            requestId,
            editorId: detail.editorId,
            container: area.container,
            position,
            transform: area.area.transform,
            controller
        });

        if (activePinPairPicker?.requestId === requestId) {
            activePinPairPicker.menu = menu;
        }
    }

    function cancelActivePinPairPicker(reason: string): void {
        const activePicker = activePinPairPicker;
        if (!activePicker) {
            return;
        }

        closeActivePinPairPicker(activePicker.requestId, reason, true);
    }

    function closeActivePinPairPicker(requestId: number, reason: string, dispatchCancel: boolean): void {
        const activePicker = activePinPairPicker;
        if (!activePicker || activePicker.requestId !== requestId) {
            return;
        }

        activePinPairPicker = undefined;
        activePicker.menu?.close();

        if (!dispatchCancel) {
            return;
        }

        const detail: RetePinPairPickerCancelDetail = {
            requestId: activePicker.requestId,
            editorId: activePicker.editorId,
            reason
        };

        if (typeof CustomEvent !== "undefined") {
            area.container.dispatchEvent(new CustomEvent(retePinPairPickerCancelEventName, {
                bubbles: true,
                detail
            }));
        }
    }

    function activePickerReferencesNode(nodeId: string): boolean {
        return activePinPairPicker?.candidates.some(candidate =>
            candidate.initial.nodeId === nodeId ||
            candidate.candidate.nodeId === nodeId ||
            candidate.source.nodeId === nodeId ||
            candidate.target.nodeId === nodeId) ?? false;
    }

    function activePickerReferencesSocket(socket: ReteSocketData): boolean {
        return activePinPairPicker?.candidates.some(candidate =>
            candidate.initial.element === socket.element ||
            candidate.candidate.element === socket.element ||
            candidate.source.element === socket.element ||
            candidate.target.element === socket.element) ?? false;
    }

    function updateNodeCompatibilityClasses(
        socketsList: ReteSocketData[],
        pickedSocket: ReteSocketData,
        nearest?: ReteSocketData
    ): void {
        const socketsByNode = new Map<string, ReteSocketData[]>();
        socketsList.forEach(socket => {
            const list = socketsByNode.get(socket.nodeId) ?? [];
            list.push(socket);
            socketsByNode.set(socket.nodeId, list);
        });

        area.nodeViews.forEach((view, nodeId) => {
            const element = view.element;
            clearNodeCompatibilityElement(element);

            if (nodeId === pickedSocket.nodeId) {
                setNodeCompatibilityElement(element, "picked");
                return;
            }

            const nodeSockets = socketsByNode.get(nodeId) ?? [];
            const compatible = nodeSockets.some(socket =>
                socket.element !== pickedSocket.element &&
                getSocketCompatibility(pickedSocket, socket, editor).compatible);
            const hasCandidate = nodeSockets.some(socket =>
                socket.element !== pickedSocket.element &&
                !!getCanonicalSocketPair(pickedSocket, socket));

            if (compatible) {
                setNodeCompatibilityElement(element, "compatible");
            } else if (hasCandidate || nodeSockets.length > 0) {
                setNodeCompatibilityElement(element, "incompatible");
            }

            if (nearest && nearest.nodeId === nodeId) {
                element.setAttribute("data-node-nearest", "true");
            } else {
                element.removeAttribute("data-node-nearest");
            }
        });
    }

    function clearNodeCompatibilityClasses(): void {
        area.nodeViews.forEach(view => clearNodeCompatibilityElement(view.element));
    }

    function getEditorIdFromSocket(socket: ReteSocketData): string | undefined {
        const node = editor.getNode(socket.nodeId) as ReteNodeSchemes | undefined;
        return node?.editorId;
    }

    function getNodeLabelFromSocket(socket: ReteSocketData): string | undefined {
        const node = editor.getNode(socket.nodeId) as ReteNodeSchemes | undefined;
        return formatNodeDisplayName(node?.label, socket.nodeId);
    }

    function hydrateSocket(socket: SocketData): ReteSocketData {
        return hydrateReteSocketData(sockets.get(socket.element) ?? socket);
    }

    function onAreaPointerDownCapture(event: PointerEvent): void {
        if (!picked) {
            return;
        }

        if (event.button === 2) {
            cancelPendingConnection("right-click");
            return;
        }

        if (event.button !== 0) {
            return;
        }

        boardPointerDown = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            startedOnSocket: Boolean(findSocketAtPoint(event.clientX, event.clientY))
        };
    }

    function onWindowPointerUpCapture(event: PointerEvent): void {
        const pointerDown = boardPointerDown;
        boardPointerDown = undefined;
        if (!picked || !pointerDown || pointerDown.pointerId !== event.pointerId || pointerDown.startedOnSocket) {
            return;
        }

        const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
        if (moved <= 4 && !findSocketAtPoint(event.clientX, event.clientY)) {
            cancelPendingConnection("empty-board-click");
        }
    }

    function onWindowBlur(): void {
        cancelPendingConnection("window-blur");
    }

    function onDocumentKeyDown(event: KeyboardEvent): void {
        if (event.key !== "Escape" || !picked) {
            return;
        }

        event.preventDefault();
        cancelPendingConnection("escape");
    }

    function onOutputLauncherArm(event: CustomEvent<ReteOutputLauncherArmDetail>): void {
        const detail = event.detail;
        const socket = Array.from(sockets.values())
            .find(item => item.nodeId === detail.nodeId && getSocketPinMetadata(item).id === detail.pinId);
        if (!socket) {
            return;
        }

        armSocketFromExternalPicker(socket).catch(console.error);
    }

    async function armSocketFromExternalPicker(socket: ReteSocketData): Promise<void> {
        if (!connectionFlow) {
            return;
        }

        const internalConnection = connection as unknown as {
            currentFlow?: ClickToArmConnectionFlow<S, any[]>;
            preudoconnection?: { mount: (area: AreaPlugin<S, Area2D<S>>) => void };
            update: () => void;
        };

        internalConnection.currentFlow = connectionFlow;
        const armed = await connectionFlow.arm(socket, createFlowContext());
        if (!armed) {
            return;
        }

        internalConnection.preudoconnection?.mount(area);
        internalConnection.update();
    }

    function cancelPendingConnection(reason: string): void {
        if (!connectionFlow || !picked) {
            return;
        }

        connectionFlow.cancel(createFlowContext(), reason).catch(console.error);
        connection.drop();
    }

    function createFlowContext(): Context<S, any[]> {
        return {
            editor,
            scope: connection as any,
            socketsCache: new Map(Array.from(sockets.entries()))
        };
    }

    function findSocketAtPoint(clientX: number, clientY: number): ReteSocketData | undefined {
        const elements = area.container.ownerDocument.elementsFromPoint?.(clientX, clientY) ?? [];
        for (const element of elements) {
            const socket = sockets.get(element as HTMLElement);
            if (socket && !isSocketConcealed(socket)) {
                return socket;
            }
        }

        return undefined;
    }
}

function setNodeCompatibilityElement(element: HTMLElement, state: "compatible" | "incompatible" | "picked"): void {
    element.classList.add(`rete-node-${state}`);
    element.setAttribute("data-node-compatibility", state);

    if (state === "incompatible") {
        element.setAttribute("data-node-disabled", "true");
        element.setAttribute("aria-disabled", "true");
        element.style.opacity = "0.32";
        element.style.filter = "grayscale(0.92) contrast(0.72)";
    }
}

function clearNodeCompatibilityElement(element: HTMLElement): void {
    element.classList.remove(...nodeCompatibilityClasses);
    nodeCompatibilityAttributeNames.forEach(attributeName => element.removeAttribute(attributeName));
    element.removeAttribute("data-node-nearest");
    element.style.opacity = "";
    element.style.filter = "";
}

function getSocketCompatibility<S extends Schemes>(
    picked: ReteSocketData,
    candidate: ReteSocketData,
    editor: NodeEditor<S>
): RetePinCompatibilityResult {
    if (picked.element === candidate.element) {
        return {compatible: false, reason: "same-socket"};
    }

    const pair = getCanonicalSocketPair(picked, candidate);
    if (!pair) {
        return {compatible: false, reason: "direction"};
    }

    if (isSameNodePair(pair)) {
        return {compatible: false, reason: "same-node"};
    }

    return evaluatePinCompatibility(pair.sourcePin, pair.targetPin, {
        sourceConnectionCount: countConnections(editor, pair.source, pair.sourcePin),
        targetConnectionCount: countConnections(editor, pair.target, pair.targetPin)
    });
}

function countConnections<S extends Schemes>(
    editor: NodeEditor<S>,
    socket: ReteSocketData,
    pin: RetePinParams
): number {
    return editor.getConnections().filter(connection => {
        if (pin.direction === "output") {
            return connection.source === socket.nodeId && connection.sourceOutput === pin.id;
        }

        return connection.target === socket.nodeId && connection.targetInput === pin.id;
    }).length;
}

function updateCompatibilityClasses<S extends Schemes>(
    sockets: ReteSocketData[],
    picked: ReteSocketData,
    editor: NodeEditor<S>,
    nearest?: ReteSocketData
): void {
    sockets.forEach(socket => {
        clearSocketClasses(socket);

        if (socket.element === picked.element) {
            addSocketClass(socket, "rete-pin-picked");
            syncSocketConcealedState(socket);
            return;
        }

        if (isSocketPairIgnoredForGesture(picked, socket)) {
            syncSocketConcealedState(socket);
            return;
        }

        const compatibility = getSocketCompatibility(picked, socket, editor);
        setSocketCompatibilityAttributes(socket, compatibility);
        if (compatibility.compatible) {
            addSocketClass(socket, "rete-pin-compatible");
            if (compatibility.replacement) {
                addSocketClass(socket, "rete-pin-replacement");
            }
        } else {
            addSocketClass(socket, "rete-pin-incompatible");
        }

        if (nearest && nearest.element === socket.element) {
            addSocketClass(socket, "rete-pin-nearest");
        }

        syncSocketConcealedState(socket);
    });
}

function isSocketCandidateAvailableForGesture<S extends Schemes>(
    picked: ReteSocketData,
    candidate: ReteSocketData,
    editor: NodeEditor<S>
): boolean {
    if (isSocketPairIgnoredForGesture(picked, candidate)) {
        return false;
    }

    const compatibility = getSocketCompatibility(picked, candidate, editor);
    if (!compatibility.compatible && isSocketConcealed(candidate)) {
        return false;
    }

    return true;
}

function isSocketPairIgnoredForGesture(picked: ReteSocketData, candidate: ReteSocketData): boolean {
    if (candidate.element === picked.element) {
        return true;
    }

    const pair = getCanonicalSocketPair(picked, candidate);
    return !pair || isSameNodePair(pair);
}

function isSocketConcealed(socket: ReteSocketData): boolean {
    const pin = getSocketPinMetadata(socket);
    if (!pin.isAdvanced) {
        return false;
    }

    return !getClassTargets(socket).some(hasSocketRevealState);
}

function hasSocketRevealState(element: HTMLElement): boolean {
    return socketRevealClasses.some(className => element.classList?.contains(className));
}

function shouldApplyConcealedInlineState(element: HTMLElement): boolean {
    return element.classList?.contains("pin-advanced-concealable") ||
        element.classList?.contains("socket-port") ||
        element.classList?.contains("rete-pin-socket") ||
        element.hasAttribute?.("data-pin-id") === true;
}

function clearCompatibilityClasses(sockets: ReteSocketData[]): void {
    sockets.forEach(clearSocketClasses);
    sockets.forEach(syncSocketConcealedState);
}

function getClassTargets(socket: ReteSocketData): HTMLElement[] {
    const targets: HTMLElement[] = [];
    const addTarget = (element?: HTMLElement | null) => {
        if (element && !targets.includes(element)) {
            targets.push(element);
        }
    };

    addTarget(socket.element);
    if (typeof socket.element.querySelectorAll === "function") {
        socket.element
            .querySelectorAll<HTMLElement>("[data-pin-id]")
            .forEach(addTarget);
    }

    const closestSocketPort = typeof socket.element.closest === "function"
        ? socket.element.closest<HTMLElement>(".socket-port")
        : undefined;
    addTarget(closestSocketPort);

    for (let current = socket.element.parentElement; current; current = current.parentElement) {
        if (current.classList?.contains("socket-port") ||
            current.classList?.contains("rete-pin-socket") ||
            current.classList?.contains("pin-advanced-concealable") ||
            current.hasAttribute?.("data-pin-id")) {
            addTarget(current);
        }

        if (current === closestSocketPort) {
            break;
        }
    }

    return targets;
}

function addSocketClass(socket: ReteSocketData, className: string): void {
    getClassTargets(socket).forEach(element => element.classList.add(className));
}

function clearSocketClasses(socket: ReteSocketData): void {
    getClassTargets(socket).forEach(element => {
        element.classList.remove(...compatibilityClasses);
        compatibilityAttributeNames.forEach(attributeName => element.removeAttribute(attributeName));
    });
    syncSocketConcealedState(socket);
}

function updateConnectionStateClasses<S extends Schemes>(
    sockets: ReteSocketData[],
    editor: NodeEditor<S>
): void {
    sockets.forEach(socket => updateSocketConnectionState(socket, editor));
}

function updateSocketConnectionState<S extends Schemes>(
    socket: ReteSocketData,
    editor: NodeEditor<S>
): void {
    const pin = getSocketPinMetadata(socket);
    const connected = countConnections(editor, socket, pin) > 0;

    getClassTargets(socket).forEach(element => {
        element.classList.remove(...connectionStateClasses);
        connectionStateAttributeNames.forEach(attributeName => element.removeAttribute(attributeName));

        if (connected) {
            element.classList.add("rete-pin-connected");
            element.setAttribute("data-pin-connected", "true");
        }
    });
    syncSocketConcealedState(socket);
}

function setSocketCompatibilityAttributes(socket: ReteSocketData, compatibility: RetePinCompatibilityResult): void {
    getClassTargets(socket).forEach(element => {
        element.setAttribute("data-pin-compatibility", compatibility.compatible ? "compatible" : "incompatible");

        if (compatibility.reason) {
            element.setAttribute("data-pin-compatibility-reason", compatibility.reason);
        }

        if (compatibility.replacement) {
            element.setAttribute("data-pin-replacement", "true");
        }

        if (compatibility.preferred) {
            element.setAttribute("data-pin-preferred", "true");
        }

        if (!compatibility.compatible && socket.side === "input") {
            element.setAttribute("data-pin-disabled", "true");
            element.setAttribute("aria-disabled", "true");
        }
    });
    syncSocketConcealedState(socket);
}

function syncSocketConcealedState(socket: ReteSocketData): void {
    const pin = getSocketPinMetadata(socket);
    const concealed = isSocketConcealed(socket);
    getClassTargets(socket).forEach(element => {
        if (concealed) {
            element.setAttribute("data-pin-hidden", "true");
            element.setAttribute("aria-hidden", "true");
            if (pin.isAdvanced && shouldApplyConcealedInlineState(element)) {
                element.style.opacity = "0";
                element.style.pointerEvents = "none";
            }
        } else {
            element.removeAttribute("data-pin-hidden");
            element.removeAttribute("aria-hidden");
            if (pin.isAdvanced && shouldApplyConcealedInlineState(element)) {
                element.style.opacity = "1";
                element.style.pointerEvents = "auto";
            }
        }
    });
}
