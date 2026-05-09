import * as React from "react";
import {ClassicPreset} from "rete";
import {ClassicScheme, Presets} from "rete-react-plugin";
import styled from "styled-components";
import {
    createReteOutputLauncherArmEvent,
    createReteOutputLauncherMenuRows,
    getOrderedReteOutputLauncherOptions,
    getPinDisplayName,
    getPinSide,
    getPinTooltip,
    getPrimaryReteOutputLauncherOption,
    getReteOutputLauncherOptionByMenuIndex,
    getSocketPin,
    handleReteOutputLauncherMenuClick,
    handleReteOutputLauncherMenuPointerDown,
    isCompactOutputLauncherPin,
    NodeExtraData,
    ReteCustomNodeProps,
    ReteNodeAutoSizeMode,
    ReteOutputLauncherOption,
    RetePinDirection,
    RetePinParams,
    RetePinSide
} from "./rete-editor-shared";
import {shouldConcealAdvancedPin} from "./rete-custom-socket-component";
import {sortByIndex} from "./scaffolding/utils";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {addRootComponent, ComponentParameters, IDynamicRootComponent} from "./BlazorFacade";
import {$nodewidth, $socketmargin, $socketsize} from "./vars";

const {RefSocket} = Presets.classic;

export const selectedShadow = '0px 2px 6px 2px #985700, 0 0 0px 5px #c9b144;'

type RenderedSocketPort = {
    key: string;
    direction: RetePinDirection;
    socket: ClassicPreset.Socket;
    index?: number;
};

type RenderedOutputLauncherPort = RenderedSocketPort & ReteOutputLauncherOption & {
    pin: RetePinParams;
};

type RenderedOutputLauncher = {
    side: Exclude<RetePinSide, "auto">;
    ports: RenderedOutputLauncherPort[];
    index?: number;
};

type RenderedSocketItem =
    | { kind: "port"; port: RenderedSocketPort; index?: number }
    | { kind: "launcher"; launcher: RenderedOutputLauncher; index?: number };

export const NodeStyledComponent = styled.div<NodeExtraData & { styles?: (props: any) => any }>`
    border-radius: 10px;
    color: white;
    cursor: pointer;
    box-sizing: border-box;
    
    min-width: ${(props) => `${$nodewidth}px`};
    width: ${(props) => Number.isFinite(props.width) ? `${props.width}px` : `auto`};
    height: ${(props) => Number.isFinite(props.height) ? `${props.height}px` : `auto`};
    
    ${props => Number.isFinite(props.scale) ? `scale: ${props.scale};` : ''}
    position: relative;
    user-select: none;
    border: 1px solid #000 !important;
    box-shadow: ${props => props.selected ? selectedShadow : '0 5px 5px 1px rgba(0,0,0,.3)'};
    background-color: hsla(0, 0%, 6%, .55) !important;

    .output {
        text-align: right;
    }

    .input {
        text-align: left;
    }

    .output-socket {
        text-align: right;
        margin-right: -1px;
        display: inline-block;
    }

    .input-socket {
        text-align: left;
        margin-left: -1px;
        display: inline-block;
    }

    .node-grid {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto minmax(0, 1fr) auto;
        height: 100%;
        width: 100%;
        position: relative; 
        min-width: 100px;
        min-height: 50px;
    }

    .node-sockets {
        display: flex;
        justify-content: center; 
        align-items: center;
        gap: 2px;
    }

    .node-sockets-top {
        grid-column: 2;
        grid-row: 1;
        align-self: start;
    }

    .node-sockets-bottom {
        grid-column: 2;
        grid-row: 3;
        align-self: end;
    }

    .node-sockets-left {
        grid-column: 1;
        grid-row: 2;
        flex-direction: column;
        justify-self: start;
    }

    .node-sockets-right {
        grid-column: 3;
        grid-row: 2;
        flex-direction: column;
        justify-self: end;
    }

    .socket-port {
        line-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .socket-port.pin-advanced-concealable:not(.rete-pin-connected):not(.rete-pin-picked):not(.rete-pin-compatible):not(.rete-pin-nearest):not(.rete-pin-replacement) {
        opacity: 0;
        pointer-events: none;
    }

    .socket-port.pin-advanced-concealable.rete-pin-connected,
    .socket-port.pin-advanced-concealable.rete-pin-picked,
    .socket-port.pin-advanced-concealable.rete-pin-compatible,
    .socket-port.pin-advanced-concealable.rete-pin-nearest,
    .socket-port.pin-advanced-concealable.rete-pin-replacement {
        opacity: 1;
        pointer-events: auto;
    }

    .output-launcher {
        position: relative;
        line-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .output-launcher::after {
        content: "";
        position: absolute;
        right: 2px;
        bottom: 2px;
        width: 5px;
        height: 5px;
        border-right: 1px solid rgba(255, 255, 255, 0.72);
        border-bottom: 1px solid rgba(255, 255, 255, 0.72);
        transform: rotate(45deg);
        pointer-events: none;
    }

    .output-launcher-ref-stack {
        position: relative;
        width: ${$socketsize + $socketmargin * 2}px;
        height: ${$socketsize + $socketmargin * 2}px;
        display: inline-block;
    }

    .output-launcher-socket-ref {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
    }

    .output-launcher-socket-active {
        opacity: 1;
        pointer-events: auto;
    }

    .output-launcher-menu {
        position: absolute;
        z-index: 50;
        min-width: 150px;
        max-width: 260px;
        max-height: 220px;
        overflow-y: auto;
        padding: 4px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(24, 24, 27, 0.98);
        color: #f8fafc;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
        font: 12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: normal;
        pointer-events: auto;
    }

    .output-launcher-menu-side-right {
        top: 0;
        right: calc(100% + 6px);
    }

    .output-launcher-menu-side-left {
        top: 0;
        left: calc(100% + 6px);
    }

    .output-launcher-menu-side-top {
        top: calc(100% + 6px);
        right: 0;
    }

    .output-launcher-menu-side-bottom {
        bottom: calc(100% + 6px);
        right: 0;
    }

    .output-launcher-menu__row {
        display: flex;
        width: 100%;
        min-height: 28px;
        align-items: flex-start;
        gap: 6px;
        padding: 6px 8px;
        border: 0;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        text-align: left;
        white-space: nowrap;
        font: inherit;
    }

    .output-launcher-menu__row:hover,
    .output-launcher-menu__row:focus {
        background: rgba(125, 211, 252, 0.16);
        outline: none;
    }

    .output-launcher-menu__shortcut {
        min-width: 12px;
        opacity: 0.65;
        text-align: right;
        padding-top: 1px;
        flex: 0 0 auto;
    }

    .output-launcher-menu__content {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .output-launcher-menu__label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .node-content {
        grid-column: 2;
        grid-row: 2;
        display: grid;
        place-items: center; 
        min-width: 0;
        min-height: 0;
    }

    ${(props) => props.styles && props.styles(props)}
`;

function calculateNodeDimensions(nodeExtraData: NodeExtraData): { width: number | undefined, height: number | undefined } {
    
    let width: number | undefined = nodeExtraData.width;
    let height: number | undefined = nodeExtraData.height;

    if (!nodeExtraData.width) {
        throw new Error('width must be provided for the node');
    }

    if (!nodeExtraData.height) {
        throw new Error('height must be provided for the node');
    }

    if (nodeExtraData.autoSize) {
        if (nodeExtraData.autoSize === ReteNodeAutoSizeMode.Width || nodeExtraData.autoSize === ReteNodeAutoSizeMode.WidthAndHeight) {
            width = undefined;
        }

        if (nodeExtraData.autoSize === ReteNodeAutoSizeMode.Height || nodeExtraData.autoSize === ReteNodeAutoSizeMode.WidthAndHeight) {
            height = undefined;
        }
    }

    return { width, height };
}

function getRenderedPorts<Scheme extends ClassicScheme>(data: Scheme["Node"]): RenderedSocketPort[] {
    const inputs = Object.entries(data.inputs)
        .filter(([, input]) => !!input)
        .map(([key, input]) => ({
            key,
            direction: "input" as RetePinDirection,
            socket: input!.socket,
            index: input!.index
        }));

    const outputs = Object.entries(data.outputs)
        .filter(([, output]) => !!output)
        .map(([key, output]) => ({
            key,
            direction: "output" as RetePinDirection,
            socket: output!.socket,
            index: output!.index
        }));

    return [...inputs, ...outputs].sort((a, b) => {
        const ai = a.index ?? 0;
        const bi = b.index ?? 0;
        return ai - bi;
    });
}

function getOutputLauncherPorts(ports: RenderedSocketPort[]): RenderedOutputLauncherPort[] {
    const launcherPorts = ports
        .map(port => {
            const pin = getSocketPin(port.socket);
            return pin && isCompactOutputLauncherPin(pin)
                ? {...port, pin}
                : undefined;
        })
        .filter((port): port is RenderedOutputLauncherPort => !!port);

    return getOrderedReteOutputLauncherOptions(launcherPorts);
}

function createRenderedOutputLauncher(ports: RenderedSocketPort[]): RenderedOutputLauncher | undefined {
    const launcherPorts = getOutputLauncherPorts(ports);
    if (launcherPorts.length <= 1) {
        return undefined;
    }

    const primaryPort = getPrimaryReteOutputLauncherOption(launcherPorts) ?? launcherPorts[0];
    return {
        ports: launcherPorts,
        side: getPortSide(primaryPort),
        index: primaryPort.index ?? primaryPort.pin.menuOrder
    };
}

function getVisiblePorts(ports: RenderedSocketPort[], launcher?: RenderedOutputLauncher): RenderedSocketPort[] {
    if (!launcher) {
        return ports;
    }

    const launcherKeys = new Set(launcher.ports.map(port => `${port.direction}:${port.key}`));
    return ports.filter(port => !launcherKeys.has(`${port.direction}:${port.key}`));
}

function getItemsForSide(
    ports: RenderedSocketPort[],
    side: Exclude<RetePinSide, "auto">,
    launcher?: RenderedOutputLauncher
): RenderedSocketItem[] {
    const items: RenderedSocketItem[] = ports
        .filter(port => getPortSide(port) === side)
        .map(port => ({kind: "port", port, index: port.index}));

    if (launcher?.side === side) {
        items.push({kind: "launcher", launcher, index: launcher.index});
    }

    return items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

function renderSocketPort<Scheme extends ClassicScheme>(
    props: ReteCustomNodeProps<Scheme>,
    port: RenderedSocketPort
) {
    const pin = getSocketPin(port.socket);
    const side = getPortSide(port);
    const direction = pin?.direction ?? port.direction;
    const testId = `${direction}-${port.key}`;
    const hidden = shouldConcealAdvancedPin(pin);

    return (
        <div
            className={`socket-port socket-${direction} socket-side-${side}${pin?.isAdvanced ? " pin-advanced pin-advanced-concealable" : ""}`}
            key={`${direction}-${port.key}`}
            data-testid={testId}
            data-pin-id={pin?.id ?? port.key}
            data-pin-family={pin?.family}
            data-pin-direction={direction}
            data-pin-side={side}
            data-value-type-id={pin?.valueTypeId}
            data-pin-role={pin?.pinRole}
            data-pin-flow={pin?.flowState}
            data-pin-evaluating={pin?.isEvaluating ? "true" : undefined}
            data-pin-hidden={hidden ? "true" : undefined}
            aria-hidden={hidden ? "true" : undefined}>
            <RefSocket
                name={`${direction}-socket`}
                emit={props.emit}
                side={direction}
                socketKey={port.key}
                nodeId={props.data.id}
                payload={port.socket}
            />
        </div>
    );
}

function renderSocketItem<Scheme extends ClassicScheme>(
    props: ReteCustomNodeProps<Scheme>,
    item: RenderedSocketItem
) {
    return item.kind === "launcher"
        ? <ReteOutputLauncher key="value-output-launcher" nodeProps={props} launcher={item.launcher}/>
        : renderSocketPort(props, item.port);
}

function getPortSide(port: RenderedSocketPort) {
    const pin = getSocketPin(port.socket);
    return getPinSide(pin ?? {
        id: port.key,
        family: "route",
        direction: port.direction,
        side: port.direction === "output" ? "bottom" : "top"
    });
}

function ReteOutputLauncher<Scheme extends ClassicScheme>(props: {
    nodeProps: ReteCustomNodeProps<Scheme>;
    launcher: RenderedOutputLauncher;
}) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const orderedPorts = useMemo(
        () => getOrderedReteOutputLauncherOptions(props.launcher.ports),
        [props.launcher.ports]
    );
    const primaryPort = useMemo(
        () => getPrimaryReteOutputLauncherOption(orderedPorts) ?? orderedPorts[0],
        [orderedPorts]
    );
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHotkeyArmed, setIsHotkeyArmed] = useState(false);
    const rows = useMemo(
        () => createReteOutputLauncherMenuRows(orderedPorts),
        [orderedPorts]
    );

    const activePort = primaryPort;
    const activePin = activePort?.pin;

    const armPort = useCallback((option: RenderedOutputLauncherPort) => {
        rootRef.current?.dispatchEvent(createReteOutputLauncherArmEvent({
            nodeId: props.nodeProps.data.id,
            pinId: option.pin.id
        }));
    }, [props.nodeProps.data.id]);

    const selectByIndex = useCallback((index: number) => {
        const option = getReteOutputLauncherOptionByMenuIndex(orderedPorts, index);
        if (!option) {
            return;
        }

        setIsMenuOpen(false);
        armPort(option);
    }, [armPort, orderedPorts]);

    const selectByPointerDown = useCallback((event: React.PointerEvent, index: number) => {
        handleReteOutputLauncherMenuPointerDown(event.nativeEvent, index, selectByIndex);
    }, [selectByIndex]);

    const selectByClick = useCallback((event: React.MouseEvent, index: number) => {
        handleReteOutputLauncherMenuClick(event.nativeEvent, index, selectByIndex);
    }, [selectByIndex]);

    useEffect(() => {
        if (!isMenuOpen && !isHotkeyArmed) {
            return;
        }

        const ownerDocument = rootRef.current?.ownerDocument;
        if (!ownerDocument) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsMenuOpen(false);
                return;
            }

            if (/^[1-9]$/.test(event.key)) {
                const index = Number(event.key) - 1;
                if (index < rows.length) {
                    event.preventDefault();
                    selectByIndex(index);
                }
            }
        };

        const onPointerDown = (event: PointerEvent) => {
            if (!isMenuOpen) {
                return;
            }

            const target = event.target as Node | null;
            if (target && rootRef.current?.contains(target)) {
                return;
            }

            setIsMenuOpen(false);
        };

        ownerDocument.addEventListener("keydown", onKeyDown, true);
        ownerDocument.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            ownerDocument.removeEventListener("keydown", onKeyDown, true);
            ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, [isMenuOpen, isHotkeyArmed, rows.length, selectByIndex]);

    if (!activePort || !activePin) {
        return null;
    }

    const activePinName = getPinDisplayName(activePin) ?? activePin.id;
    const launcherTitle = `${getPinTooltip(activePin) ?? activePinName} (${activePin.id})`;

    const openMenu = (event: React.MouseEvent | React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsMenuOpen(true);
    };

    const onPointerDownCapture = (event: React.PointerEvent) => {
        if (event.button === 2) {
            openMenu(event);
            return;
        }

        if (event.button === 0) {
            setIsMenuOpen(false);
        }
    };

    return (
        <div
            className={`output-launcher output-launcher-side-${props.launcher.side}`}
            ref={rootRef}
            tabIndex={0}
            title={launcherTitle}
            data-testid="output-launcher"
            data-output-launcher="true"
            data-primary-pin-id={primaryPort?.pin.id}
            data-primary-pin-name={primaryPort ? getPinDisplayName(primaryPort.pin) ?? primaryPort.pin.id : undefined}
            data-active-pin-id={activePin.id}
            data-active-pin-name={activePinName}
            data-output-count={orderedPorts.length}
            data-pin-ids={orderedPorts.map(port => port.pin.id).join(",")}
            data-pin-names={orderedPorts.map(port => getPinDisplayName(port.pin) ?? port.pin.id).join(",")}
            data-value-type-id={activePin.valueTypeId}
            onContextMenu={openMenu}
            onPointerEnter={() => setIsHotkeyArmed(true)}
            onPointerLeave={() => setIsHotkeyArmed(false)}
            onFocus={() => setIsHotkeyArmed(true)}
            onBlur={() => setIsHotkeyArmed(false)}
            onPointerDownCapture={onPointerDownCapture}>
            <div className="output-launcher-ref-stack">
                {orderedPorts.map(port => {
                    const isActive = port.key === activePort.key;
                    const pinName = getPinDisplayName(port.pin) ?? port.pin.id;

                    return (
                        <RefSocket
                            key={`output-launcher-${port.key}`}
                            name={`output-launcher-socket-ref output-socket ${isActive ? "output-launcher-socket-active" : ""}`}
                            emit={props.nodeProps.emit}
                            side="output"
                            socketKey={port.key}
                            nodeId={props.nodeProps.data.id}
                            payload={port.socket}
                            data-output-launcher-socket="true"
                            data-pin-id={port.pin.id}
                            data-pin-name={pinName}
                            data-pin-family={port.pin.family}
                            data-pin-direction={port.pin.direction}
                            data-pin-side={getPinSide(port.pin)}
                            data-value-type-id={port.pin.valueTypeId}
                            aria-hidden={!isActive}
                        />
                    );
                })}
            </div>
            {isMenuOpen && (
                <div
                    className={`output-launcher-menu output-launcher-menu-side-${props.launcher.side}`}
                    role="menu"
                    data-output-launcher-menu="true"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => event.stopPropagation()}>
                    {rows.map(row => (
                        <button
                            type="button"
                            key={row.pinId}
                            className="output-launcher-menu__row"
                            role="menuitem"
                            title={row.title}
                            data-index={row.index}
                            data-pin-id={row.pinId}
                            data-pin-name={row.pinName}
                            data-pin-preferred={row.isPrimary ? "true" : undefined}
                            data-pin-advanced={row.isAdvanced ? "true" : undefined}
                            data-value-type-id={row.valueTypeId}
                            data-coordinate-type-id={row.coordinateTypeId}
                            onPointerDownCapture={event => selectByPointerDown(event, row.index)}
                            onClick={event => selectByClick(event, row.index)}>
                            <span className="output-launcher-menu__shortcut">{row.index + 1}</span>
                            <span className="output-launcher-menu__content">
                                <span className="output-launcher-menu__label">{row.label}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ReteCustomNodeComponent<Scheme extends ClassicScheme>(props: ReteCustomNodeProps<Scheme>) {
    const blazorNodeRef = useRef<HTMLSpanElement | null>(null);
    const rootComponentRef = useRef<IDynamicRootComponent | null>(null);

    const createBlazorComponentParameters = (): ComponentParameters => {
        const host = props.data.blazorHost;
        const includeDefaultNodeParameters = host?.includeDefaultNodeParameters ?? true;
        const parameters: Record<string, unknown> = {};

        if (includeDefaultNodeParameters) {
            parameters["Id"] = props.data.id;
            parameters["EditorId"] = props.data.editorId;
            parameters["ExtraParams"] = props.data.extraParams;
            parameters["Label"] = props.data.label;
        }

        if (host?.parameters) {
            Object.assign(parameters, host.parameters);
        }

        return parameters;
    };

    const initializeBlazorComponent = async (disposedRef: { current: boolean }) => {
        const nodeElement = blazorNodeRef.current;
        if (nodeElement) {
            const componentIdentifier = props.data.blazorHost?.componentIdentifier ?? 'blazor-rete-node';
            const rootComponent = await addRootComponent(nodeElement, componentIdentifier, createBlazorComponentParameters());
            if (disposedRef.current) {
                await rootComponent.dispose();
                return;
            }
            rootComponentRef.current = rootComponent;
        }
    };

    useEffect(() => {
        const disposedRef = { current: false };

        initializeBlazorComponent(disposedRef);
        return () => {
            disposedRef.current = true;
            const rootComponent = rootComponentRef.current;
            rootComponentRef.current = null;
            if (rootComponent) {
                rootComponent.dispose().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        const rootComponent = rootComponentRef.current;
        if (!rootComponent) {
            return;
        }

        rootComponent.setParameters(createBlazorComponentParameters());
    }, [props.data.id, props.data.editorId, props.data.label, props.data.extraParams, props.data.blazorHost]);

    const controls = Object.entries(props.data.controls);
    const allPorts = getRenderedPorts(props.data);
    const outputLauncher = createRenderedOutputLauncher(allPorts);
    const ports = getVisiblePorts(allPorts, outputLauncher);
    const topItems = getItemsForSide(ports, "top", outputLauncher);
    const rightItems = getItemsForSide(ports, "right", outputLauncher);
    const bottomItems = getItemsForSide(ports, "bottom", outputLauncher);
    const leftItems = getItemsForSide(ports, "left", outputLauncher);
    const selected = props.data.selected || false;
    const {editorId} = props.data;

    const showSockets = allPorts.length > 0;
    const size = calculateNodeDimensions(props.data);
    const actualSize = { 
        width: size.width, 
        height: showSockets ? size.height : size.height ? size.height / 2 : undefined 
    };
    const scale = showSockets ? 1 : 0.75;

    sortByIndex(controls);

    return (
        <NodeStyledComponent
            selected={selected}
            scale={scale}
            styles={props.styles}
            data-testid="node"
            editorId={editorId}
            extraParams={props.data.extraParams}
            width={actualSize.width}
            height={actualSize.height}>
            <div className="node-grid">
                <div className="node-sockets node-sockets-top">
                    {showSockets && topItems.map(item => renderSocketItem(props, item))}
                </div>

                <div className="node-sockets node-sockets-left">
                    {showSockets && leftItems.map(item => renderSocketItem(props, item))}
                </div>

                <span className="node-content" ref={blazorNodeRef}>
                </span>

                <div className="node-sockets node-sockets-right">
                    {showSockets && rightItems.map(item => renderSocketItem(props, item))}
                </div>

                <div className="node-sockets node-sockets-bottom">
                    {showSockets && bottomItems.map(item => renderSocketItem(props, item))}
                </div>
            </div>
        </NodeStyledComponent>
    );
}
