import React = require("react");
import {createEditor} from "./rete-editor-factory";
import {useRete} from "rete-react-plugin";

export type ReteComponentProps = {
    id: string;
};

export default function ReteComponent(props: ReteComponentProps) {
    const [ref, editor] = useRete(createEditor);

    return (
        <div id={props.id} ref={ref} className={"ReteApp d-flex"} style={{height: "100%", width: "100%"}} >
            <div id={"rete-editor-toolbar"} className={"overflow-auto"}></div>
            <div id={"rete-editor-canvas"} className={"flex-grow-1"} style={{height: "100%"}}></div>
        </div>
    );
}