import * as React from "react";
import styled from "styled-components";
import { ClassicScheme, Presets } from "rete-react-plugin";

const { useConnection } = Presets.classic;

const Svg = styled.svg`
  overflow: visible !important;
  position: absolute;
  pointer-events: none;
  width: 9999px;
  height: 9999px;
`;

const MagneticPath = styled.path<{ styles?: (props: any) => any }>`
  fill: none;
  stroke-width: 5px;
  stroke: #ffd92c;
  pointer-events: auto;
  ${(props) => props.styles && props.styles(props)};
  filter: blur(2px);
`;

type MagneticConnectionData = ClassicScheme["Connection"] & {
    isLoop?: boolean;
    isMagnetic?: boolean;
    sourceNodeId?: string;
    sourcePinId?: string;
    sourcePinSide?: string;
    targetNodeId?: string;
    targetPinId?: string;
    targetPinSide?: string;
};

export function MagneticConnection(props: {
    data: MagneticConnectionData;
    styles?: () => any;
}) {
    const { path } = useConnection();

    if (!path) return null;

    const connectionKind = props.data.isMagnetic ? "magnetic-preview" : "preview";
    const sourceNodeId = props.data.sourceNodeId || props.data.source || undefined;
    const sourcePinId = props.data.sourcePinId || props.data.sourceOutput || undefined;
    const targetNodeId = props.data.targetNodeId || props.data.target || undefined;
    const targetPinId = props.data.targetPinId || props.data.targetInput || undefined;

    return (
        <Svg
            data-testid="magnetic-connection"
            data-connection-id={props.data.id}
            data-connection-kind={connectionKind}
            data-source-node-id={sourceNodeId}
            data-source-pin-id={sourcePinId}
            data-source-pin-side={props.data.sourcePinSide}
            data-target-node-id={targetNodeId}
            data-target-pin-id={targetPinId}
            data-target-pin-side={props.data.targetPinSide}>
            <MagneticPath
                className={`rete-connection rete-connection-preview-${connectionKind}`}
                styles={props.styles}
                d={path} />
        </Svg>
    );
}
