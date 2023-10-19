import * as React from "react";
import {ClassicScheme, Presets} from "rete-react-plugin";
import styled, {css} from "styled-components";
import {$nodewidth, $socketmargin, $socketsize} from "./vars";
import {NodeExtraData, ReteCustomNodeProps} from "./rete-editor-shared";
import {sortByIndex} from "./scaffolding/utils";

const {RefSocket, RefControl} = Presets.classic;

export const selectedShadow = '0px 2px 6px 2px #985700, 0 0 0px 5px #c9b144;'

export const NodeStyles = styled.div<NodeExtraData & { styles?: (props: any) => any }>`
  border-radius: 10px;
  color: white;
  cursor: pointer;
  box-sizing: border-box;
  width: ${(props) =>
          Number.isFinite(props.width) ? `${props.width}px` : `${$nodewidth}px`};
  height: ${(props) =>
          Number.isFinite(props.height) ? `${props.height}px` : "auto"};
  padding-bottom: 6px;
  position: relative;
  user-select: none;
  border: 1px solid #000 !important;
  box-shadow: ${props => props.selected ? selectedShadow : '0 5px 5px 1px rgba(0,0,0,.3)'};
  background-color: hsla(0, 0%, 6%, .55) !important;

  .title {
    white-space: nowrap;
    background: radial-gradient(50% 90%, #3f80c39e 0%, transparent 80%);
    font-size: 20px;
    padding: 5px;
    border-radius: 15px 15px 0 0;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: -1px -1px 0 #000,
      1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000; /* This gives a black outline around the text */
  }

  .glossy {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-top: 1.5px solid #ffffffb3;
    border-radius: inherit;
    background: linear-gradient(180deg, rgb(255 255 255 / 25%) 0px, rgb(255 255 255 / 21%) 3px, rgb(255 255 255 / 14%) 6px, rgb(255 255 255 / 10%) 9px, rgb(255 255 255 / 10%) 13px, transparent 13px);
    z-index: -1;
  }

  ${(props) =>
          props.isActive &&
          css`
            .glossy-active {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: radial-gradient(circle 70px at center, rgba(0, 255, 0, 1), transparent); /* Adjust circle size here */
              box-shadow: 0 0 8px 4px rgba(0, 255, 0, 0.5); /* Adjust glow effect here */
              z-index: -1;
            }
          `}
  .output {
    text-align: right;
  }

  .input {
    text-align: left;
  }

  .output-socket {
    text-align: right;
    margin-right: -1px;
    display: inline-block;
  }

  .input-socket {
    text-align: left;
    margin-left: -1px;
    display: inline-block;
  }

  .input-title,
  .output-title {
    vertical-align: middle;
    color: white;
    display: inline-block;
    font-family: sans-serif;
    font-size: 14px;
    margin: ${$socketmargin}px;
    line-height: ${$socketsize}px;
  }

  .input-control {
    z-index: 1;
    width: calc(100% - ${$socketsize + 2 * $socketmargin}px);
    vertical-align: middle;
    display: inline-block;
  }

  .control {
    display: block;
    padding: ${$socketmargin}px ${$socketsize / 2 + $socketmargin}px;
  }

  ${(props) => props.styles && props.styles(props)}
`;

export function ReteCustomNodeComponent<Scheme extends ClassicScheme>(props: ReteCustomNodeProps<Scheme>) {
    const inputs = Object.entries(props.data.inputs);
    const outputs = Object.entries(props.data.outputs);
    const controls = Object.entries(props.data.controls);
    const selected = props.data.selected || false;
    const isActive = props.data.isActive || false;
    const isBusy = props.data.isBusy || false;
    const showSockets = props.data.showSockets || true;
    const {id, label, width, height} = props.data;
    
    sortByIndex(inputs);
    sortByIndex(outputs);
    sortByIndex(controls);

    return (
        <NodeStyles
            selected={selected}
            width={width}
            height={height}
            isActive={isActive}
            styles={props.styles}
            data-testid="node">
            <div className="glossy"></div>
            {isActive && <div className="glossy-active"></div>}
            <div className="title" data-testid="title">
                {label}
            </div>
            <div className="d-flex">
                {/* Inputs */}
                {showSockets && inputs.map(
                    ([key, input]) =>
                        input && (
                            <div className="input" key={key} data-testid={`input-${key}`}>
                                <RefSocket
                                    name="input-socket"
                                    emit={props.emit}
                                    side="input"
                                    socketKey={key}
                                    nodeId={id}
                                    payload={input.socket}
                                />
                                {input && (!input.control || !input.showControl) && (
                                    <div className="input-title" data-testid="input-title">
                                        {input?.label}
                                    </div>
                                )}
                                {input?.control && input?.showControl && (
                                    <span className="input-control">
                              <RefControl
                                  key={key}
                                  name="input-control"
                                  emit={props.emit}
                                  payload={input.control}
                              />
                            </span>)}
                            </div>))}
                <div className="flex-grow-1 text-center">
                    {isBusy && <div className="spinner-border text-warning"></div>}
                </div>

                {/* Outputs */}
                {showSockets && outputs.map(
                    ([key, output]) =>
                        output && (
                            <div className="output" key={key} data-testid={`output-${key}`}>
                                <div className="output-title" data-testid="output-title">
                                    {output?.label}
                                </div>
                                <RefSocket
                                    name="output-socket"
                                    side="output"
                                    emit={props.emit}
                                    socketKey={key}
                                    nodeId={id}
                                    payload={output.socket}
                                />
                            </div>
                        )
                )}
            </div>

            {/* Controls */}
            {showSockets && controls.map(([key, control]) => {
                return control ? (
                    <RefControl
                        key={key}
                        name="control"
                        emit={props.emit}
                        payload={control}
                    />
                ) : null;
            })}
        </NodeStyles>
    );
}