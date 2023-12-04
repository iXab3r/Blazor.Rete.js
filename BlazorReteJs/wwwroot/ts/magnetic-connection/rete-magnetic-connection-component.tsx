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

export function MagneticConnection(props: {
    data: ClassicScheme["Connection"] & { isLoop?: boolean };
    styles?: () => any;
}) {
    const { path } = useConnection();

    if (!path) return null;

    return (
        <Svg data-testid="connection">
            <MagneticPath styles={props.styles} d={path} />
        </Svg>
    );
}
