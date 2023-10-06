import React = require("react");
import { createEditor } from "./reteEditor";
import { useRete } from "rete-react-plugin";

export type ReteAppProps = {
    id: string;
};

export default function ReteApp(props: ReteAppProps) {
    const [ref, editor] = useRete(createEditor);
    
    return (
        <div id={props.id} className="ReteApp" ref={ref} style={{ height: "100%", width: "100%" }}></div>
    );
}
 