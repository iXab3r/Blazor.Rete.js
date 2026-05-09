import * as React from "react";
import styled, {css} from "styled-components";
import { ClassicScheme, Presets } from "rete-react-plugin";
import {ReteCustomConnectionProps, ConnectionExtraData} from "./rete-editor-shared";

const { useConnection } = Presets.classic;

const Svg = styled.svg`
  overflow: visible !important;
  position: absolute;
  pointer-events: none;
  width: 9999px;
  height: 9999px;
`;

const Path = styled.path<ConnectionExtraData & { styles?: (props: any) => any }>`
  fill: none;
  stroke-width: 5px;
  ${(props) =>
          props.isActive === true &&
          css`
            stroke: greenyellow;
          `}
  ${(props) =>
          props.isActive === false &&
          css`
            stroke: red;
          `}
  ${(props) =>
          props.isActive === undefined  &&
          css`
            stroke: ${props.family === "value" ? "#7dd3fc" : "orange"};
          `}
  pointer-events: auto;
  ${(props) => props.styles && props.styles(props)}
`;

export function ReteCustomConnectionComponent<Scheme extends ClassicScheme>(props: ReteCustomConnectionProps<Scheme>) {
    const { path } = useConnection();
    if (!path) return null;
    
    return (
        <Svg
            data-testid="connection"
            data-connection-id={props.data.id}
            data-connection-family={props.data.family}
            data-connection-order={props.data.order}
            data-source-node-id={props.data.source}
            data-source-pin-id={props.data.sourceOutput}
            data-target-node-id={props.data.target}
            data-target-pin-id={props.data.targetInput}>
            <Path
                className={`rete-connection rete-connection-family-${props.data.family ?? "unknown"}`}
                isActive={props.data.isActive}
                family={props.data.family}
                order={props.data.order}
                styles={props.styles}
                d={path} />
        </Svg>
    );
}
