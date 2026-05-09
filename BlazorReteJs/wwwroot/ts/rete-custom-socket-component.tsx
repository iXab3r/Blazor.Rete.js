import * as React from "react";
import { ClassicPreset } from "rete";
import styled from "styled-components";
import {
    getPinCssToken,
    getPinSide,
    getPinTooltip,
    getSocketPin,
    RetePinParams
} from "./rete-editor-shared";
import {$socketmargin, $socketsize} from "./vars";

const Styles = styled.div<{
    $family?: string;
    $direction?: string;
    $side?: string;
}>`
    display: inline-block;
    cursor: pointer;
    border: 1px solid white;
    border-radius: ${(props) => props.$family === "route" ? `${$socketsize / 2.0}px` : "2px"};
    width: ${$socketsize}px;
    height: ${$socketsize}px;
    vertical-align: middle;
    background: ${(props) => props.$family === "value" ? "#7dd3fc" : "#ffffff47"};
    z-index: 2;
    box-sizing: border-box;
    transition: border-width 80ms ease, opacity 80ms ease, filter 80ms ease, transform 80ms ease, box-shadow 80ms ease;

    &.pin-role-condition {
      background: #86efac;
      border-color: rgba(255, 255, 255, 0.86);
    }

    ${(props) => props.$family === "value" && props.$direction === "input" ? `
        clip-path: ${getInputTriangleClipPath(props.$side)};
    ` : ""}

    ${(props) => props.$family === "value" && props.$direction === "output" ? `
        border-radius: 2px;
    ` : ""}

    &:hover {
      border-width: 4px;
    }

    &.multiple {
      border-color: yellow;
    }

    &.rete-pin-compatible {
      opacity: 1;
      box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.3);
    }

    &.pin-role-condition.rete-pin-compatible {
      box-shadow: 0 0 0 3px rgba(134, 239, 172, 0.34);
    }

    &.rete-pin-incompatible {
      opacity: 0.25;
      filter: grayscale(0.7);
    }

    &.rete-pin-incompatible.pin-direction-input {
      opacity: 0.16;
      filter: grayscale(1) contrast(0.7);
      cursor: not-allowed;
    }

    &.rete-pin-nearest {
      transform: scale(1.15);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.28);
    }

    &.rete-pin-replacement {
      border-color: #ffd34d;
      box-shadow: 0 0 0 3px rgba(255, 211, 77, 0.35);
    }

    &.pin-evaluating {
      animation: rete-pin-evaluating-pulse 720ms ease-in-out infinite alternate;
      border-color: #fbbf24;
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.34), 0 0 12px rgba(251, 191, 36, 0.42);
    }

    &.pin-flow-evaluating:not(.pin-evaluating) {
      animation: rete-pin-flow-evaluating 880ms ease-out 1;
      border-color: #fbbf24;
    }

    &.pin-flow-cached {
      animation: rete-pin-flow-cached 760ms ease-out 1;
      border-color: #34d399;
    }

    @keyframes rete-pin-evaluating-pulse {
      from {
        transform: scale(1);
      }
      to {
        transform: scale(1.22);
      }
    }

    @keyframes rete-pin-flow-evaluating {
      0% {
        box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
        filter: brightness(1.35);
      }
      100% {
        box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
        filter: brightness(1);
      }
    }

    @keyframes rete-pin-flow-cached {
      0% {
        box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55);
        transform: scale(1.18);
      }
      100% {
        box-shadow: 0 0 0 7px rgba(52, 211, 153, 0);
        transform: scale(1);
      }
    }

    &.pin-advanced-concealable:not(.rete-pin-connected):not(.rete-pin-picked):not(.rete-pin-compatible):not(.rete-pin-nearest):not(.rete-pin-replacement) {
      opacity: 0;
      pointer-events: none;
      transform: scale(0.72);
    }

    &.pin-advanced-concealable.rete-pin-connected,
    &.pin-advanced-concealable.rete-pin-picked,
    &.pin-advanced-concealable.rete-pin-compatible,
    &.pin-advanced-concealable.rete-pin-nearest,
    &.pin-advanced-concealable.rete-pin-replacement {
      opacity: 1;
      pointer-events: auto;
    }
`

const Hoverable = styled.div`
    border-radius: ${($socketsize + $socketmargin * 2) / 2.0}px;
    padding-left: ${$socketmargin}px;
    padding-right: ${$socketmargin}px;
    display: inline-flex;

    &.pin-advanced-concealable:not(.rete-pin-connected):not(.rete-pin-picked):not(.rete-pin-compatible):not(.rete-pin-nearest):not(.rete-pin-replacement) {
      opacity: 0;
      pointer-events: none;
    }

    &.pin-advanced-concealable.rete-pin-connected,
    &.pin-advanced-concealable.rete-pin-picked,
    &.pin-advanced-concealable.rete-pin-compatible,
    &.pin-advanced-concealable.rete-pin-nearest,
    &.pin-advanced-concealable.rete-pin-replacement {
      opacity: 1;
      pointer-events: auto;
    }

    &:hover ${Styles} {
      border-width: 4px;
    }
`

function getSocketClasses(pin?: RetePinParams): string {
    const classes = ["rete-pin-socket"];
    if (!pin) {
        return classes.join(" ");
    }

    classes.push(`pin-family-${getPinCssToken(pin.family) ?? "unknown"}`);
    classes.push(`pin-direction-${pin.direction}`);
    classes.push(`pin-side-${getPinSide(pin)}`);

    const valueTypeToken = getPinCssToken(pin.valueTypeId);
    if (valueTypeToken) {
        classes.push(`pin-value-type-${valueTypeToken}`);
    }

    if (pin.isPrimary) {
        classes.push("pin-primary");
    }

    if (pin.isAdvanced) {
        classes.push("pin-advanced");
        classes.push("pin-advanced-concealable");
    }

    if (pin.isEvaluating) {
        classes.push("pin-evaluating");
    }

    const flowToken = getPinCssToken(pin.flowState);
    if (flowToken) {
        classes.push(`pin-flow-${flowToken}`);
    }

    const roleToken = getPinCssToken(pin.pinRole);
    if (roleToken) {
        classes.push(`pin-role-${roleToken}`);
    }

    return classes.join(" ");
}

export function shouldConcealAdvancedPin(
    pin?: RetePinParams,
    state: { connected?: boolean; selected?: boolean; compatible?: boolean } = {}
): boolean {
    return Boolean(pin?.isAdvanced && !state.connected && !state.selected && !state.compatible);
}

export function getInputTriangleClipPath(side?: string): string {
    switch (side) {
        case "left":
            return "polygon(0 0, 100% 50%, 0 100%)";
        case "right":
            return "polygon(100% 0, 0 50%, 100% 100%)";
        case "top":
            return "polygon(0 0, 100% 0, 50% 100%)";
        case "bottom":
        default:
            return "polygon(50% 0, 100% 100%, 0 100%)";
    }
}

function getSocketAriaLabel(pin?: RetePinParams, fallbackName?: string): string {
    if (!pin) {
        return fallbackName || "socket";
    }

    const parts = [
        pin.name || pin.id,
        pin.id,
        pin.family,
        pin.direction,
        pin.valueTypeId
    ].filter(Boolean);

    return parts.join(", ");
}

export function ReteCustomSocketComponent<T extends ClassicPreset.Socket>(props: { data: T }) {
    const pin = getSocketPin(props.data);
    const side = pin ? getPinSide(pin) : undefined;
    const tooltip = getPinTooltip(pin) || props.data.name;
    const classes = getSocketClasses(pin);
    const initiallyHidden = shouldConcealAdvancedPin(pin);

    return (
        <Hoverable
            className={classes}
            data-pin-id={pin?.id}
            data-pin-family={pin?.family}
            data-pin-direction={pin?.direction}
            data-pin-side={side}
            data-value-type-id={pin?.valueTypeId}
            data-pin-role={pin?.pinRole}
            data-pin-flow={pin?.flowState}
            data-pin-evaluating={pin?.isEvaluating ? "true" : undefined}
            data-pin-hidden={initiallyHidden ? "true" : undefined}
            aria-hidden={initiallyHidden ? "true" : undefined}>
            <Styles
                className={classes}
                title={tooltip}
                aria-label={getSocketAriaLabel(pin, props.data.name)}
                $family={pin?.family}
                $direction={pin?.direction}
                $side={side}
                data-pin-id={pin?.id}
                data-pin-family={pin?.family}
                data-pin-direction={pin?.direction}
                data-pin-side={side}
                data-value-type-id={pin?.valueTypeId}
                data-coordinate-type-id={pin?.coordinateTypeId}
                data-pin-role={pin?.pinRole}
                data-pin-flow={pin?.flowState}
                data-pin-evaluating={pin?.isEvaluating ? "true" : undefined}
                data-pin-hidden={initiallyHidden ? "true" : undefined}
                aria-hidden={initiallyHidden ? "true" : undefined} />
        </Hoverable>
    )
}
