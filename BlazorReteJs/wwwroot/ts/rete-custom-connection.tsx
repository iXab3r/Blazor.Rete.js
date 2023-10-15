import * as React from "react";
import styled, {css} from "styled-components";
import { ClassicScheme, Presets } from "rete-react-plugin";
import {ReteCustomConnectionProps, ConnectionExtraData} from "./reteEditor.shared";

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
            stroke: orange;
          `}
  pointer-events: auto;
  ${(props) => props.styles && props.styles(props)}
`;

export function ReteCustomConnection<Scheme extends ClassicScheme>(props: ReteCustomConnectionProps<Scheme>) {
    const { path } = useConnection();
    if (!path) return null;
    
    return (
        <Svg data-testid="connection">
            <Path isActive={props.data.isActive} styles={props.styles} d={path} />
        </Svg>
    );
}
