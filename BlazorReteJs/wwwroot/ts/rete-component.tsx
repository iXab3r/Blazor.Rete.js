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