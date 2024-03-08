import * as React from "react";
import {ClassicScheme, Presets} from "rete-react-plugin";
import styled, {css} from "styled-components";
import {NodeExtraData, ReteCustomNodeProps, ReteNodeAutoSizeMode} from "./rete-editor-shared";
import {sortByIndex} from "./scaffolding/utils";
import {useEffect, useRef} from "react";
import {addRootComponent, ComponentParameters} from "./BlazorFacade";
import {$nodewidth} from "./vars";

const {RefSocket} = Presets.classic;

export const selectedShadow = '0px 2px 6px 2px #985700, 0 0 0px 5px #c9b144;'

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
        grid-template-rows: auto 1fr auto; 
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
        width: 100%; 
    }

    .node-sockets-top {
        top: 0; 
    }

    .node-sockets-bottom {
        bottom: 0; 
    }

    .node-content {
        display: grid;
        place-items: center; 
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

export function ReteCustomNodeComponent<Scheme extends ClassicScheme>(props: ReteCustomNodeProps<Scheme>) {
    const blazorNodeRef = useRef(null);

    const initializeBlazorComponent = async () => {
        const nodeElement = blazorNodeRef.current;
        if (nodeElement) {
            const blazorComponentParameters: ComponentParameters = [];
            blazorComponentParameters["Id"] = props.data.id;
            blazorComponentParameters["EditorId"] = props.data.editorId;
            blazorComponentParameters["ExtraParams"] = props.data.extraParams;
            blazorComponentParameters["Label"] = props.data.label;
            await addRootComponent(nodeElement, 'blazor-rete-node', blazorComponentParameters);
        }
    };

    useEffect(() => {
        initializeBlazorComponent();
    }, []);

    const inputs = Object.entries(props.data.inputs);
    const outputs = Object.entries(props.data.outputs);
    const controls = Object.entries(props.data.controls);
    const selected = props.data.selected || false;
    const {id, label, editorId} = props.data;

    const showSockets = Object.keys(props.data.inputs).length > 0 || Object.keys(props.data.outputs).length > 0;
    const size = calculateNodeDimensions(props.data);
    const actualSize = { 
        width: size.width, 
        height: showSockets ? size.height : size.height ? size.height / 2 : undefined 
    };
    const scale = showSockets ? 1 : 0.75;

    sortByIndex(inputs);
    sortByIndex(outputs);
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
                    {showSockets && inputs.map(([key, input]) => input && (
                        <div className="socket-input" key={key} data-testid={`input-${key}`}>
                            <RefSocket
                                name="input-socket"
                                emit={props.emit}
                                side="input"
                                socketKey={key}
                                nodeId={id}
                                payload={input.socket}
                            />
                        </div>
                    ))}
                </div>

                <span className="node-content" ref={blazorNodeRef}>
                </span>

                <div className="node-sockets node-sockets-bottom">
                    {showSockets && outputs.map(([key, output]) => output && (
                        <div className="socket-output" key={key} data-testid={`output-${key}`}>
                            <RefSocket
                                name="output-socket"
                                side="output"
                                emit={props.emit}
                                socketKey={key}
                                nodeId={id}
                                payload={output.socket}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </NodeStyledComponent>
    );
}