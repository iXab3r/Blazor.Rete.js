import * as React from "react";
import {createEditor} from "./rete-editor-factory";
import {useRete} from "rete-react-plugin";
import styled from "styled-components";
import {useEffect, useState} from "react";
import {Mode, Shape} from "./selection";
import { Radio } from 'antd'

export type ReteComponentProps = {
    id: string;
};


const ModeSwitch = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  @media (max-width: 768px) {
    top: 3.5rem;
    left: 1rem;
    right: 1rem;
    text-align: center;
  }
`

const ShapeSwitch = styled.div`
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  @media (max-width: 768px) {
    left: 1rem;
    text-align: center;
  }
`

const ButtonSwitch = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  @media (max-width: 768px) {
    left: 1rem;
    text-align: center;
  }
`

const modeOptions = [
    { label: 'Select node\'s rectangle', value: 'rect' },
    { label: 'Select node\'s center', value: 'center' },
]

const shapeOptions = [
    { label: 'Lasso selection', value: 'lasso' },
    { label: 'Marquee selection', value: 'marquee' },
]


const buttonOptions = [
    { label: 'Left mouse button', value: 0 },
    { label: 'Middle mouse button', value: 1 },
]

export default function ReteComponent(props: ReteComponentProps) {
    const [ref, editor] = useRete(createEditor);

    const [mode, setMode] = useState<Mode>('rect')
    const [shape, setShape] = useState<Shape>('lasso')
    const [button, setButton] = useState<0 | 1>(1)

    useEffect(() => editor?.setSelectionMode(mode), [editor, mode])
    useEffect(() => editor?.setSelectionShape(shape), [editor, shape])
    useEffect(() => editor?.setSelectionButton(button), [editor, button])

    return (
        <div id={props.id} ref={ref} className={"ReteApp d-flex h-100 w-100"}>
            <div id={"rete-editor-toolbar"} className={"overflow-auto"}></div>
            <div id={"rete-editor-canvas"} className={"flex-grow-1"} style={{height: "100%"}}></div>
        </div>
    );
}