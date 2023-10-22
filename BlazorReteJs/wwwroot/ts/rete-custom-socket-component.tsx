import * as React from "react";
import { ClassicPreset } from "rete";
import styled from "styled-components";
import {$socketmargin, $socketsize} from "./vars";

const Styles = styled.div`
    display: inline-block;
    cursor: pointer;
    border: 1px solid white;
    border-radius: ${$socketsize / 2.0}px;
    width: ${$socketsize}px;
    height: ${$socketsize}px;
    vertical-align: middle;
    background: #ffffff47;// #e8e8e8;
    z-index: 2;
    box-sizing: border-box;
    &:hover {
      border-width: 4px;
    }
    &.multiple {
      border-color: yellow;
    }
`

const Hoverable = styled.div`
    border-radius: ${($socketsize + $socketmargin * 2) / 2.0}px;
    padding-left: ${$socketmargin}px;
    padding-right: ${$socketmargin}px;
    display: inline-flex;
    &:hover ${Styles} {
      border-width: 4px;
    }
`

export function ReteCustomSocketComponent<T extends ClassicPreset.Socket>(props: { data: T }) {
    return (
        // @ts-ignore
        <Hoverable>
            {/* @ts-ignore */}
            <Styles title={props.data.name}/>
        </Hoverable>
    )
}
