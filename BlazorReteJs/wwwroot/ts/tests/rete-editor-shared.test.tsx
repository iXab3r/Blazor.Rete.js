const nodeCrypto = require("crypto");
Object.defineProperty(globalThis, "crypto", {
    value: nodeCrypto,
    configurable: true
});
if (typeof globalThis.CustomEvent === "undefined") {
    Object.defineProperty(globalThis, "CustomEvent", {
        value: class CustomEvent<T = unknown> extends Event {
            public readonly detail: T;

            constructor(type: string, init?: CustomEventInit<T>) {
                super(type, init);
                this.detail = init?.detail as T;
            }
        },
        configurable: true
    });
}

const React = require("react");
const {renderToStaticMarkup} = require("react-dom/server") as typeof import("react-dom/server");
const {
    createSideAwareConnectionPathPoints,
    cubicBezierConnectionCurveFactory,
    createReteOutputLauncherArmEvent,
    createReteOutputLauncherMenuController,
    createReteOutputLauncherMenuRows,
    getPrimaryReteOutputLauncherOption,
    getReteOutputLauncherOptionByMenuIndex,
    getSocketPin,
    handleReteOutputLauncherMenuClick,
    handleReteOutputLauncherMenuPointerDown,
    ReteConnection,
    ReteNode,
    reteOutputLauncherArmEventName,
    selectReteOutputLauncherMenuOption
} = require("../rete-editor-shared") as typeof import("../rete-editor-shared");
const {ReteCustomSocketComponent} = require("../rete-custom-socket-component") as typeof import("../rete-custom-socket-component");
import type {RetePinParams} from "../rete-editor-shared";

describe("Rete typed pin bridge model", () => {
    const routeInput: RetePinParams = {
        id: "route-in",
        name: "Route input",
        family: "route",
        direction: "input",
        tooltip: "Continue execution"
    };

    const valueOutput: RetePinParams = {
        id: "window-region",
        name: "Window region",
        family: "value",
        direction: "output",
        valueTypeId: "region",
        tooltip: "Target-window-relative region",
        menuOrder: 3
    };

    it("round-trips explicit pins through ReteNodeParams and stable socket keys", () => {
        // Given
        const node = new ReteNode("editor", {
            id: "node-a",
            label: "Node A",
            maxInputs: 9,
            maxOutputs: 9,
            pins: [routeInput, valueOutput]
        });

        // When
        const params = node.getParams();

        // Then
        expect(params.pins).toEqual([routeInput, valueOutput]);
        expect(Object.keys(node.inputs)).toEqual(["route-in"]);
        expect(Object.keys(node.outputs)).toEqual(["window-region"]);
        expect(getSocketPin(node.outputs["window-region"]?.socket)?.valueTypeId).toBe("region");
    });

    it("uses legacy maxInputs and maxOutputs fallback when pins are absent", () => {
        // Given
        const node = new ReteNode("editor", {
            id: "legacy-node",
            label: "Legacy",
            maxInputs: 1,
            maxOutputs: 2
        });

        // When
        const input = node.inputs["route-in"];
        const output = node.outputs["route-out"];

        // Then
        expect(input).toBeDefined();
        expect(output).toBeDefined();
        expect(input?.multipleConnections).toBe(false);
        expect(output?.multipleConnections).toBe(true);
        expect(getSocketPin(input?.socket)?.family).toBe("route");
        expect(getSocketPin(output?.socket)?.direction).toBe("output");
    });

    it("preserves family and order on runtime connections", () => {
        // Given
        const source = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const target = new ReteNode("editor", {
            id: "target",
            pins: [{
                id: "target-region",
                family: "value",
                direction: "input",
                valueTypeId: "region"
            }]
        });

        // When
        const connection = new ReteConnection(source, "window-region", target, "target-region", {
            family: "value",
            order: 7
        });

        // Then
        expect(connection.sourceOutput).toBe("window-region");
        expect(connection.targetInput).toBe("target-region");
        expect(connection.family).toBe("value");
        expect(connection.order).toBe(7);
    });

    it("updates pin preview metadata without rebuilding socket objects", () => {
        // Given
        const node = new ReteNode("editor", {
            id: "node-a",
            label: "Node A",
            pins: [valueOutput]
        });
        const originalOutput = node.outputs["window-region"];
        const originalSocket = originalOutput?.socket;

        // When
        const changed = node.updateParams({
            id: "node-a",
            label: "Node A",
            pins: [{
                ...valueOutput,
                previewText: "120,90 40x30",
                previewChangedAt: "2026-05-07T12:34:56Z"
            }]
        });

        // Then
        expect(changed).toBe(true);
        expect(node.outputs["window-region"]).toBe(originalOutput);
        expect(node.outputs["window-region"]?.socket).toBe(originalSocket);
        expect(getSocketPin(node.outputs["window-region"]?.socket)?.previewText).toBe("120,90 40x30");
        expect(node.getParams().pins?.[0].previewChangedAt).toBe("2026-05-07T12:34:56Z");
    });

    it("renders socket tooltip and stable pin data attributes", () => {
        // Given
        const node = new ReteNode("editor", {
            id: "node",
            pins: [valueOutput]
        });
        const socket = node.outputs["window-region"]!.socket;

        // When
        const html = renderToStaticMarkup(<ReteCustomSocketComponent data={socket}/>);

        // Then
        expect(html).toContain('title="Target-window-relative region"');
        expect(html).toContain('data-pin-id="window-region"');
        expect(html).toContain('data-pin-family="value"');
        expect(html).toContain('data-pin-direction="output"');
        expect(html).toContain('data-value-type-id="region"');
    });

    it("renders advanced typed pins with the concealable DOM class by default", () => {
        // Given
        const advancedInput: RetePinParams = {
            id: "target-region",
            name: "Mouse target",
            family: "value",
            direction: "input",
            valueTypeId: "region",
            coordinateTypeId: "window",
            isAdvanced: true
        };
        const node = new ReteNode("editor", {
            id: "mouse-move",
            pins: [advancedInput]
        });
        const socket = node.inputs["target-region"]!.socket;

        // When
        const html = renderToStaticMarkup(<ReteCustomSocketComponent data={socket}/>);

        // Then
        expect(html).toContain('data-pin-id="target-region"');
        expect(html).toContain('pin-advanced');
        expect(html).toContain('pin-advanced-concealable');
        expect(html).toContain('data-coordinate-type-id="window"');
        expect(html).toContain('data-pin-hidden="true"');
        expect(html).toContain('aria-hidden="true"');
    });

    it("renders condition pin role and flow state data for CSS-only UX", () => {
        // Given
        const conditionInput: RetePinParams = {
            id: "pre-condition",
            name: "Pre-condition",
            family: "value",
            direction: "input",
            valueTypeId: "boolean",
            isAdvanced: true,
            pinRole: "condition",
            flowState: "cached"
        };
        const node = new ReteNode("editor", {
            id: "action",
            pins: [conditionInput]
        });
        const socket = node.inputs["pre-condition"]!.socket;

        // When
        const html = renderToStaticMarkup(<ReteCustomSocketComponent data={socket}/>);

        // Then
        expect(html).toContain('data-pin-role="condition"');
        expect(html).toContain('data-pin-flow="cached"');
        expect(html).toContain('pin-role-condition');
        expect(html).toContain('pin-flow-cached');
        expect(html).not.toContain('data-pin-condition-icon="true"');
        expect(html).not.toContain(">C<");
    });

    it("builds accepted connection control points from the rendered pin sides", () => {
        // Given
        const points = [
            {x: 100, y: 100},
            {x: 220, y: 180}
        ];

        // When
        const postConditionPath = createSideAwareConnectionPathPoints(points, "right", "bottom");
        const preConditionPath = createSideAwareConnectionPathPoints(points, "right", "top");
        const ordinaryInputPath = createSideAwareConnectionPathPoints(points, "right", "left");

        // Then
        expect(postConditionPath[1].x).toBeGreaterThan(postConditionPath[0].x);
        expect(postConditionPath[1].x - postConditionPath[0].x).toBeGreaterThanOrEqual(36);
        expect(postConditionPath[2].y).toBeGreaterThan(postConditionPath[3].y);
        expect(preConditionPath[2].y).toBeLessThan(preConditionPath[3].y);
        expect(ordinaryInputPath[2].x).toBeLessThan(ordinaryInputPath[3].x);
    });

    it("renders accepted connection points as a cubic with source and target side tangents", () => {
        // Given
        const points = [
            {x: 100, y: 100},
            {x: 220, y: 180}
        ];
        const pathPoints = createSideAwareConnectionPathPoints(points, "right", "bottom");
        const context = new RecordingCurveContext();
        const curve = cubicBezierConnectionCurveFactory(context);

        // When
        curve.lineStart();
        pathPoints.forEach(point => curve.point(point.x, point.y));
        curve.lineEnd();

        // Then
        expect(context.commands).toHaveLength(2);
        const move = context.commands[0] as RecordingMoveCommand;
        const cubic = context.commands[1] as RecordingCubicCommand;
        expect(move).toEqual({type: "M", x: 100, y: 100});
        expect(cubic).toMatchObject({type: "C", x: 220, y: 180});
        expect(cubic.x1).toBeGreaterThan(move.x);
        expect(cubic.y1).toBe(move.y);
        expect(cubic.x2).toBe(cubic.x);
        expect(cubic.y2).toBeGreaterThan(cubic.y);
    });

    it("chooses the primary compact output launcher pin when metadata marks one", () => {
        // Given
        const firstByOrder = toOutputOption({
            id: "first",
            name: "First",
            family: "value",
            direction: "output",
            menuOrder: 1
        }, 0);
        const primary = toOutputOption({
            id: "primary",
            name: "Primary",
            family: "value",
            direction: "output",
            isPrimary: true,
            menuOrder: 9
        }, 1);

        // When
        const selected = getPrimaryReteOutputLauncherOption([primary, firstByOrder]);

        // Then
        expect(selected?.key).toBe("primary");
    });

    it("falls back to the first compact output launcher row by menu order", () => {
        // Given
        const first = toOutputOption({
            id: "first",
            family: "value",
            direction: "output",
            menuOrder: 1
        }, 0);
        const second = toOutputOption({
            id: "second",
            family: "value",
            direction: "output",
            menuOrder: 2
        }, 1);

        // When
        const selected = getPrimaryReteOutputLauncherOption([second, first]);

        // Then
        expect(selected?.key).toBe("first");
    });

    it("orders compact output launcher menu rows before advanced entries", () => {
        // Given
        const advanced = toOutputOption({
            id: "advanced",
            name: "Advanced",
            family: "value",
            direction: "output",
            isAdvanced: true,
            menuOrder: 0
        }, 0);
        const preferred = toOutputOption({
            id: "preferred",
            name: "Preferred",
            family: "value",
            direction: "output",
            isPrimary: true,
            menuOrder: 2
        }, 1);
        const ordinary = toOutputOption({
            id: "ordinary",
            name: "Ordinary",
            family: "value",
            direction: "output",
            menuOrder: 1
        }, 2);

        // When
        const rows = createReteOutputLauncherMenuRows([advanced, preferred, ordinary]);

        // Then
        expect(rows.map(row => row.pinId)).toEqual(["ordinary", "preferred", "advanced"]);
        expect(rows[1].isPrimary).toBe(true);
        expect(rows[2].isAdvanced).toBe(true);
    });

    it("keeps output launcher menu rows free of transient preview values", () => {
        // Given
        const previewed = toOutputOption({
            id: "window-region",
            name: "Window region",
            family: "value",
            direction: "output",
            previewText: "1280x720 region",
            previewChangedAt: "2026-05-06T12:34:56Z"
        }, 0);

        // When
        const rows = createReteOutputLauncherMenuRows([previewed]);

        // Then
        expect(rows[0].label).toBe("Window region");
        expect(rows[0].previewText).toBeUndefined();
        expect(rows[0].previewChangedAt).toBeUndefined();
        expect(rows[0].previewValue).toBeUndefined();
        expect(rows[0].title).not.toContain("1280x720 region");
        expect(rows[0].title).not.toContain("2026-05-06T12:34:56Z");
    });

    it("selects compact output launcher entries by visible menu index", () => {
        // Given
        const first = toOutputOption({
            id: "first",
            family: "value",
            direction: "output",
            menuOrder: 1
        }, 0);
        const second = toOutputOption({
            id: "second",
            family: "value",
            direction: "output",
            menuOrder: 2
        }, 1);

        // When
        const selected = getReteOutputLauncherOptionByMenuIndex([second, first], 1);

        // Then
        expect(selected?.key).toBe("second");
    });

    it("creates the same compact output launcher arm event for menu and hotkey selections", () => {
        // Given / When
        const event = createReteOutputLauncherArmEvent({
            nodeId: "source",
            pinId: "second"
        });

        // Then
        expect(event.type).toBe("rete-output-launcher-arm");
        expect(event.bubbles).toBe(true);
        expect(event.detail).toEqual({
            nodeId: "source",
            pinId: "second"
        });
    });

    it("dispatches compact output launcher arm events from number-index selections without a menu controller", () => {
        // Given
        const first = toOutputOption({
            id: "window-region",
            name: "Window region",
            family: "value",
            direction: "output",
            menuOrder: 1
        }, 0);
        const second = toOutputOption({
            id: "target-region",
            name: "Target region",
            family: "value",
            direction: "output",
            menuOrder: 2
        }, 1);
        const root = new EventTarget();
        const details: unknown[] = [];
        root.addEventListener(reteOutputLauncherArmEventName, event => {
            details.push((event as CustomEvent).detail);
        });

        // When
        const selected = selectReteOutputLauncherMenuOption([second, first], Number("2") - 1, {
            select: option => root.dispatchEvent(createReteOutputLauncherArmEvent({
                nodeId: "image-search",
                pinId: option.pin.id
            }))
        });

        // Then
        expect(selected?.pin.id).toBe("target-region");
        expect(details).toEqual([{
            nodeId: "image-search",
            pinId: "target-region"
        }]);
    });

    it("dispatches compact output launcher arm events from pointer-selected menu rows", () => {
        // Given
        const first = toOutputOption({
            id: "window-region",
            name: "Window region",
            family: "value",
            direction: "output",
            valueTypeId: "region",
            coordinateTypeId: "window",
            menuOrder: 1
        }, 0);
        const second = toOutputOption({
            id: "target-region",
            name: "Target region",
            family: "value",
            direction: "output",
            valueTypeId: "region",
            coordinateTypeId: "window",
            menuOrder: 2
        }, 1);
        const root = new EventTarget();
        const details: unknown[] = [];
        root.addEventListener(reteOutputLauncherArmEventName, event => {
            details.push((event as CustomEvent).detail);
        });
        const event = createMenuPointerEvent(0);
        const selectByIndex = createLauncherMenuRowSelector(root, [first, second]);

        // When
        const selected = handleReteOutputLauncherMenuPointerDown(event, 1, selectByIndex);

        // Then
        expect(selected).toBe(true);
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).toHaveBeenCalledTimes(1);
        expect(details).toEqual([{
            nodeId: "image-search",
            pinId: "target-region"
        }]);
    });

    it("dispatches compact output launcher arm events from keyboard click menu rows", () => {
        // Given
        const first = toOutputOption({
            id: "window-region",
            name: "Window region",
            family: "value",
            direction: "output",
            valueTypeId: "region",
            coordinateTypeId: "window",
            menuOrder: 1
        }, 0);
        const second = toOutputOption({
            id: "target-region",
            name: "Target region",
            family: "value",
            direction: "output",
            valueTypeId: "region",
            coordinateTypeId: "window",
            menuOrder: 2
        }, 1);
        const root = new EventTarget();
        const details: unknown[] = [];
        root.addEventListener(reteOutputLauncherArmEventName, event => {
            details.push((event as CustomEvent).detail);
        });
        const event = createMenuClickEvent(0);
        const selectByIndex = createLauncherMenuRowSelector(root, [first, second]);

        // When
        const selected = handleReteOutputLauncherMenuClick(event, 1, selectByIndex);

        // Then
        expect(selected).toBe(true);
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).toHaveBeenCalledTimes(1);
        expect(details).toEqual([{
            nodeId: "image-search",
            pinId: "target-region"
        }]);
    });

    it("cancels compact output launcher menu controllers once", () => {
        // Given
        const option = toOutputOption({
            id: "value-out",
            family: "value",
            direction: "output"
        }, 0);
        const select = jest.fn();
        const close = jest.fn();
        const controller = createReteOutputLauncherMenuController([option], {
            select,
            close
        });

        // When
        controller.cancel("escape");
        controller.cancel("outside-pointerdown");
        const selected = controller.select(0);

        // Then
        expect(selected).toBeUndefined();
        expect(select).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledWith("escape", false);
    });
});

function toOutputOption(pin: RetePinParams, index: number) {
    return {
        key: pin.id,
        pin,
        index
    };
}

function createLauncherMenuRowSelector(root: EventTarget, options: ReturnType<typeof toOutputOption>[]) {
    return (index: number) => {
        selectReteOutputLauncherMenuOption(options, index, {
            select: option => root.dispatchEvent(createReteOutputLauncherArmEvent({
                nodeId: "image-search",
                pinId: option.pin.id
            }))
        });
    };
}

function createMenuPointerEvent(button: number) {
    return {
        button,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
    };
}

function createMenuClickEvent(detail: number) {
    return {
        detail,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
    };
}

type RecordingMoveCommand = { type: "M" | "L"; x: number; y: number };
type RecordingCubicCommand = { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number };
type RecordingCloseCommand = { type: "Z" };
type RecordingCommand = RecordingMoveCommand | RecordingCubicCommand | RecordingCloseCommand;

class RecordingCurveContext {
    public readonly commands: RecordingCommand[] = [];

    moveTo(x: number, y: number): void {
        this.commands.push({type: "M", x, y});
    }

    lineTo(x: number, y: number): void {
        this.commands.push({type: "L", x, y});
    }

    bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void {
        this.commands.push({type: "C", x1, y1, x2, y2, x, y});
    }

    closePath(): void {
        this.commands.push({type: "Z"});
    }
}
