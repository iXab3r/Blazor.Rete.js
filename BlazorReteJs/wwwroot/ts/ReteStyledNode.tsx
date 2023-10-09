import {Presets} from "rete-react-plugin";
import {css} from "styled-components";
import * as React from 'react'
import {Schemes} from "./reteEditor.shared";

const customStyles = css<{ selected?: boolean, isActive?: boolean }>`
  border-color: #646464;

  .title {
    color: #bb2020;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  &:hover {
    background: #f2f2f2;
  }

  ${(props) =>
          props.selected &&
          css`
            border-color: black;
          `}

  ${(props) =>
          props.isActive &&
          css`
            background: yellow;
            border-color: violet;
          `},
`;


export function ReteStyledNode(props: { data: Schemes['Node'], emit: any }) {
    console.info(`Scheme: ${JSON.stringify(props.data)}`);

    const computedStyles = props.data.isActive ? css`
      ${customStyles};
      background: green;
      border-color: purple;
    ` : customStyles;

    return (
        <>
            <Presets.classic.Node styles={() => computedStyles} {...props} />
            <div>isActive: {JSON.stringify(props.data.isActive)}</div>
            <div>isSelected: {JSON.stringify(props.data.selected)}</div>
        </>
    );
}