import React = require("react");
import {createEditor} from "./rete-editor-factory";
import {useRete} from "rete-react-plugin";

export type ReteComponentProps = {
    id: string;
};

export default function ReteComponent(props: ReteComponentProps) {
    const [ref, editor] = useRete(createEditor);

    return (
        <div id={props.id} className="ReteApp" ref={ref} style={{height: "100%", width: "100%"}}></div>
    );
}
 