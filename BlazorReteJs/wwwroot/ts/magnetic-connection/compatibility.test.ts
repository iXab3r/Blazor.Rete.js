const nodeCrypto = require("crypto");
Object.defineProperty(globalThis, "crypto", {
    value: nodeCrypto,
    configurable: true
});

const {
    ClickToArmConnectionFlow,
    applyMagneticConnectionPathMetadata,
    createPendingConnectionLabelDetail,
    createMagneticConnectionPathMetadata,
    createMagneticPreviewConnectionPathPoints,
    createPinPairPickerRows,
    createPinPairPickerSelectionController,
    createReteConnectionFromSockets,
    createReteConnectionFromSocketsAndWait,
    evaluatePinCompatibility,
    evaluateSocketCompatibility,
    getPinConnectionLimit,
    resolveCompatibleSocketPairDrop,
    useMagneticConnection
} = require("./index") as typeof import("./index");
const {
    createReteOutputLauncherMenuController,
    getReteOutputLauncherOptionByMenuIndex,
    ReteConnection,
    ReteNode
} = require("../rete-editor-shared") as typeof import("../rete-editor-shared");
const {
    shouldConcealAdvancedPin
} = require("../rete-custom-socket-component") as typeof import("../rete-custom-socket-component");
const {
    ReteEditorListener
} = require("../rete-editor-listener") as typeof import("../rete-editor-listener");
const {
    NodeEditor
} = require("rete") as typeof import("rete");

import type {RetePinParams} from "../rete-editor-shared";
import type {ReteSocketData} from "./index";

describe("Rete pin compatibility hints", () => {
    const valueOutput: RetePinParams = {
        id: "value-out",
        family: "value",
        direction: "output",
        valueTypeId: "region",
        coordinateTypeId: "window"
    };

    const valueInput: RetePinParams = {
        id: "value-in",
        family: "value",
        direction: "input",
        valueTypeId: "region",
        coordinateTypeId: "window"
    };

    it("accepts opposite direction pins with matching family and type hints", () => {
        // Given / When
        const result = evaluatePinCompatibility(valueOutput, valueInput);

        // Then
        expect(result.compatible).toBe(true);
    });

    it("rejects same direction or wrong family pins", () => {
        // Given
        const routeInput: RetePinParams = {
            id: "route-in",
            family: "route",
            direction: "input"
        };

        // When / Then
        expect(evaluatePinCompatibility(valueInput, valueOutput).reason).toBe("direction");
        expect(evaluatePinCompatibility(valueOutput, routeInput).reason).toBe("family");
    });

    it("previews ordinary input replacement when the input is occupied", () => {
        // Given / When
        const result = evaluatePinCompatibility(valueOutput, valueInput, {
            targetConnectionCount: 1
        });

        // Then
        expect(result.compatible).toBe(true);
        expect(result.replacement).toBe(true);
        expect(result.reason).toBe("target-input-replacement");
    });

    it("does not treat occupied incompatible inputs as replacement candidates", () => {
        // Given
        const booleanInput: RetePinParams = {
            ...valueInput,
            valueTypeId: "boolean"
        };

        // When
        const result = evaluatePinCompatibility(valueOutput, booleanInput, {
            targetConnectionCount: 1
        });

        // Then
        expect(result.compatible).toBe(false);
        expect(result.replacement).toBeUndefined();
        expect(result.reason).toBe("value-type");
    });

    it("rejects coordinate and value type mismatches unless a type hint allows it", () => {
        // Given
        const screenInput: RetePinParams = {
            ...valueInput,
            coordinateTypeId: "screen"
        };
        const compatibleBooleanInput: RetePinParams = {
            ...valueInput,
            valueTypeId: "boolean",
            compatibleValueTypeIds: ["region"]
        };

        // When / Then
        expect(evaluatePinCompatibility(valueOutput, screenInput).reason).toBe("coordinate-type");
        expect(evaluatePinCompatibility(valueOutput, compatibleBooleanInput).compatible).toBe(true);
    });

    it("defaults ordinary inputs to one connection and outputs to fan-out", () => {
        // Given / When / Then
        expect(getPinConnectionLimit(valueInput)).toBe(1);
        expect(getPinConnectionLimit(valueOutput)).toBeUndefined();
    });

    it("accepts input-to-output drag gestures after canonicalizing the pair", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);

        // When
        const result = evaluateSocketCompatibility(inputSocket, outputSocket);

        // Then
        expect(result.compatible).toBe(true);
    });

    it("rejects output-to-input connections on the same node as advisory incompatible", () => {
        // Given
        const outputSocket = createSocket("same-node", "value-out", "output", valueOutput);
        const inputSocket = createSocket("same-node", "value-in", "input", valueInput);

        // When
        const result = evaluateSocketCompatibility(outputSocket, inputSocket);

        // Then
        expect(result.compatible).toBe(false);
        expect(result.reason).toBe("same-node");
    });

    it("auto-resolves node-body drops only when there is one clear compatible pair", () => {
        // Given
        const editor = createEditor();
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const matchingInput = createSocket("target", "value-in", "input", valueInput);
        const routeInput = createSocket("target", "route-in", "input", {
            id: "route-in",
            family: "route",
            direction: "input"
        });

        // When
        const result = resolveCompatibleSocketPairDrop(outputSocket, [matchingInput, routeInput], editor);

        // Then
        expect(result.kind).toBe("single");
        expect(result.candidates).toHaveLength(1);
        expect(result.candidates[0].detail.targetPinId).toBe("value-in");
    });

    it("surfaces named picker candidates for ambiguous node-body drops", () => {
        // Given
        const editor = createEditor();
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const firstInput = createSocket("target", "value-in", "input", valueInput);
        const secondInput = createSocket("target", "value-in-2", "input", {
            ...valueInput,
            id: "value-in-2",
            name: "Alternate value"
        });

        // When
        const result = resolveCompatibleSocketPairDrop(outputSocket, [firstInput, secondInput], editor);

        // Then
        expect(result.kind).toBe("multiple");
        expect(result.candidates.map(candidate => candidate.detail.targetPinName)).toEqual([
            "value-in",
            "Alternate value"
        ]);
    });

    it("marks occupied ordinary inputs as replacement candidates without removing history-owned wires", () => {
        // Given
        const editor = createEditor([{
            source: "other-source",
            sourceOutput: "value-out",
            target: "target",
            targetInput: "value-in"
        }]);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const occupiedInput = createSocket("target", "value-in", "input", valueInput);

        // When
        const result = resolveCompatibleSocketPairDrop(outputSocket, [occupiedInput], editor);

        // Then
        expect(result.kind).toBe("single");
        expect(result.candidates[0].compatibility.replacement).toBe(true);
        expect(result.candidates[0].detail.replacement).toBe(true);
        expect(editor.getConnections()).toHaveLength(1);
    });

    it("builds generic picker rows with pin names and stable ids", () => {
        // Given
        const editor = createEditor();
        const outputSocket = createSocket("source", "value-out", "output", {
            ...valueOutput,
            name: "Detected region"
        });
        const inputSocket = createSocket("target", "value-in", "input", {
            ...valueInput,
            name: "Target region"
        });

        // When
        const result = resolveCompatibleSocketPairDrop(outputSocket, [inputSocket], editor);
        const rows = createPinPairPickerRows(result.candidates);

        // Then
        expect(rows[0].label).toBe("Detected region -> Target region");
        expect(rows[0].title).toContain("value-out");
        expect(rows[0].sourceNodeId).toBe("source");
        expect(rows[0].sourcePinId).toBe("value-out");
        expect(rows[0].targetNodeId).toBe("target");
        expect(rows[0].targetPinId).toBe("value-in");
    });

    it("cancels picker controller with the provided reason", () => {
        // Given
        const editor = createEditor();
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const firstInput = createSocket("target", "value-in", "input", valueInput);
        const secondInput = createSocket("target", "value-in-2", "input", {
            ...valueInput,
            id: "value-in-2"
        });
        const result = resolveCompatibleSocketPairDrop(outputSocket, [firstInput, secondInput], editor);
        const close = jest.fn();
        const controller = createPinPairPickerSelectionController(result.candidates, {
            createConnection: jest.fn(),
            close
        });

        // When
        controller.cancel("escape");
        controller.cancel("outside-pointerdown");

        // Then
        expect(close).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledWith("escape", true);
    });

    it("creates canonical connections from ambiguous picker selection", async () => {
        // Given
        const alternateOutput: RetePinParams = {
            ...valueOutput,
            id: "value-out-2",
            name: "Alternate value"
        };
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput, alternateOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const firstOutput = createSocket("source", "value-out", "output", valueOutput);
        const secondOutput = createSocket("source", "value-out-2", "output", alternateOutput);
        const result = resolveCompatibleSocketPairDrop(inputSocket, [firstOutput, secondOutput], editor);
        const close = jest.fn();
        const controller = createPinPairPickerSelectionController(result.candidates, {
            createConnection: async (from, to) => {
                createReteConnectionFromSockets(editor, from, to);
            },
            close
        });

        // When
        await controller.select(1);

        // Then
        expect(result.kind).toBe("multiple");
        expect(result.candidates.map(candidate => candidate.detail.sourcePinId)).toEqual([
            "value-out",
            "value-out-2"
        ]);
        expect(connections).toHaveLength(1);
        expect(connections[0].source).toBe("source");
        expect(connections[0].sourceOutput).toBe("value-out-2");
        expect(connections[0].target).toBe("target");
        expect(connections[0].targetInput).toBe("value-in");
        expect(connections[0].family).toBe("value");
        expect(close).toHaveBeenCalledWith("selected", false);
    });

    it("creates connections from the selected compact output launcher pin id", () => {
        // Given
        const alternateOutput: RetePinParams = {
            ...valueOutput,
            id: "value-out-2",
            name: "Alternate value",
            menuOrder: 2
        };
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput, alternateOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const selectedOutput = getReteOutputLauncherOptionByMenuIndex([
            {key: valueOutput.id, pin: valueOutput, index: 0},
            {key: alternateOutput.id, pin: alternateOutput, index: 1}
        ], 1)!;
        const outputSocket = createSocket("source", selectedOutput.key, "output", selectedOutput.pin);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);

        // When
        createReteConnectionFromSockets(editor, outputSocket, inputSocket);

        // Then
        expect(connections).toHaveLength(1);
        expect(connections[0].sourceOutput).toBe("value-out-2");
        expect(connections[0].targetInput).toBe("value-in");
        expect(connections[0].family).toBe("value");
    });

    it("tracks direct NodeEditor addConnection events in the listener collection", async () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const editor = new NodeEditor();
        const listener = new ReteEditorListener(editor as any, createListenerAreaStub());
        await editor.addNode(sourceNode as any);
        await editor.addNode(targetNode as any);
        const connection = new ReteConnection(
            sourceNode,
            "value-out" as never,
            targetNode,
            "value-in" as never,
            {family: "value"});
        connection.id = "direct-listener-connection";

        // When
        const added = await editor.addConnection(connection as any);

        // Then
        expect(added).toBe(true);
        expect(listener.getConnections().getItems()).toContain("direct-listener-connection");
    });

    it("reconciles listener connections from the editor when creation events are missed", () => {
        // Given
        const connections: any[] = [];
        const editor = {
            addPipe: jest.fn(),
            getConnections: () => connections
        };
        const listener = new ReteEditorListener(editor as any, createListenerAreaStub());

        // When
        connections.push({id: "reconciled-value-connection"});
        listener.refreshConnectionsFromEditor();

        // Then
        expect(listener.getConnections().getItems()).toEqual(["reconciled-value-connection"]);

        // When
        connections.length = 0;
        listener.refreshConnectionsFromEditor();

        // Then
        expect(listener.getConnections().getItems()).toEqual([]);
    });

    it("tracks the actual click-to-arm created value connection id and payload", async () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const trackedConnectionIds: string[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const context = createFlowContextForEditor(editor, emitted);
        const flow = new ClickToArmConnectionFlow({
            makeConnection: async (from, to, flowContext) => {
                const createdConnection = await createReteConnectionFromSocketsAndWait(flowContext.editor as any, from, to);
                if (createdConnection) {
                    trackedConnectionIds.push(createdConnection.id);
                }

                return Boolean(createdConnection);
            }
        });

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.pick({socket: inputSocket, event: "down"}, context);

        // Then
        expect(connections).toHaveLength(1);
        expect(trackedConnectionIds).toEqual([connections[0].id]);
        expect(connections[0]).toMatchObject({
            family: "value",
            source: "source",
            sourceOutput: "value-out",
            target: "target",
            targetInput: "value-in"
        });
        expect(emitted[emitted.length - 1].data.created).toBe(true);
    });

    it("does not create a same-node output-to-input connection through the generic helper", () => {
        // Given
        const node = new ReteNode("editor", {
            id: "same-node",
            pins: [valueOutput, valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([node], connections);
        const outputSocket = createSocket("same-node", "value-out", "output", valueOutput);
        const inputSocket = createSocket("same-node", "value-in", "input", valueInput);

        // When
        const created = createReteConnectionFromSockets(editor, outputSocket, inputSocket);

        // Then
        expect(created).toBeUndefined();
        expect(connections).toHaveLength(0);
    });

    it("uses node-only pending connection labels while retaining pin metadata", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", {
            ...valueOutput,
            name: "Image Search Result"
        });

        // When
        const detail = createPendingConnectionLabelDetail(outputSocket, "Image Search");

        // Then
        expect(detail.label).toBe("Image Search ->");
        expect(detail.title).toBe("Image Search ->");
        expect(detail.label).not.toContain("Image Search Result");
        expect(detail.label).not.toContain("value-out");
        expect(detail.label).not.toContain("value");
        expect(detail.label).not.toContain("region");
        expect(detail.nodeId).toBe("source");
        expect(detail.nodeLabel).toBe("Image Search");
        expect(detail.pinId).toBe("value-out");
        expect(detail.pinName).toBe("Image Search Result");
        expect(detail.direction).toBe("output");
        expect(detail.family).toBe("value");
        expect(detail.valueTypeId).toBe("region");
        expect(detail.coordinateTypeId).toBe("window");
    });

    it("includes current pin preview metadata in the pending connection label detail", () => {
        // Given
        const outputSocket = createSocket("number", "value-out", "output", {
            ...valueOutput,
            name: "Numeric output",
            previewValue: 42.5,
            previewText: "42.5",
            previewChangedAt: "2026-05-06T12:34:56Z"
        });

        // When
        const detail = createPendingConnectionLabelDetail(outputSocket, "Number");

        // Then
        expect(detail.label).toBe("Number ->");
        expect(detail.title).toBe("Number -> Value: 42.5 (2026-05-06T12:34:56Z)");
        expect(detail.title).not.toContain("Numeric output");
        expect(detail.previewValue).toBe(42.5);
        expect(detail.previewText).toBe("42.5 - 2026-05-06T12:34:56Z");
        expect(detail.previewChangedAt).toBe("2026-05-06T12:34:56Z");
    });

    it("keeps a left-clicked socket armed until cancel or a compatible socket click", async () => {
        // Given
        const flow = new ClickToArmConnectionFlow({
            makeConnection: jest.fn(() => true)
        });
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const context = createFlowContext([], emitted);

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.pick({socket: outputSocket, event: "up"}, context);
        flow.drop(context);

        // Then
        expect(flow.getPickedSocket()).toBe(outputSocket);
        expect(emitted.map(event => event.type)).toEqual(["connectionpick"]);

        // When
        await flow.pick({socket: inputSocket, event: "down"}, context);

        // Then
        expect(flow.getPickedSocket()).toBeUndefined();
        expect(emitted[emitted.length - 1]).toMatchObject({
            type: "connectiondrop",
            data: {
                initial: outputSocket,
                socket: inputSocket,
                created: true
            }
        });
    });

    it("does not arm a concealed advanced pin", async () => {
        // Given
        const flow = new ClickToArmConnectionFlow({
            makeConnection: jest.fn(() => true)
        });
        const document = new FakeDocument();
        const element = document.createElement("div") as unknown as HTMLElement;
        element.classList.add("pin-advanced-concealable");
        const pinElement = document.createElement("div") as unknown as HTMLElement;
        pinElement.classList.add("pin-advanced-concealable");
        pinElement.setAttribute("data-pin-id", "pre-condition");
        element.appendChild(pinElement);

        const hiddenInput = createSocketWithElement("target", "pre-condition", "input", {
            id: "pre-condition",
            family: "value",
            direction: "input",
            valueTypeId: "boolean",
            isAdvanced: true,
            pinRole: "condition"
        }, element);
        const emitted: any[] = [];
        const context = createFlowContext([], emitted, [hiddenInput]);

        // When
        await flow.pick({socket: hiddenInput, event: "down"}, context);

        // Then
        expect(flow.getPickedSocket()).toBeUndefined();
        expect(emitted).toEqual([]);
    });

    it("cancels an armed click-to-connect gesture explicitly", async () => {
        // Given
        const flow = new ClickToArmConnectionFlow({
            makeConnection: jest.fn()
        });
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const emitted: any[] = [];
        const context = createFlowContext([], emitted);

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.cancel(context, "right-click");

        // Then
        expect(flow.getPickedSocket()).toBeUndefined();
        expect(emitted[emitted.length - 1]).toMatchObject({
            type: "connectiondrop",
            data: {
                initial: outputSocket,
                socket: null,
                created: false
            }
        });
    });

    it("cancels an armed click-to-connect gesture for Escape", async () => {
        // Given
        const flow = new ClickToArmConnectionFlow({
            makeConnection: jest.fn()
        });
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const emitted: any[] = [];
        const context = createFlowContext([], emitted);

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.cancel(context, "escape");

        // Then
        expect(flow.getPickedSocket()).toBeUndefined();
        expect(emitted.map(event => event.type)).toEqual(["connectionpick", "connectiondrop"]);
        expect(emitted[1].data).toMatchObject({
            initial: outputSocket,
            socket: null,
            created: false
        });
    });

    it("creates an output-to-input connection through the click-to-arm flow", async () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const context = createFlowContextForEditor(editor, emitted);
        const flow = new ClickToArmConnectionFlow({
            makeConnection: (from, to, flowContext) => createReteConnectionFromSockets(flowContext.editor as any, from, to)
        });

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.pick({socket: inputSocket, event: "down"}, context);

        // Then
        expect(connections).toHaveLength(1);
        expect(connections[0].source).toBe("source");
        expect(connections[0].sourceOutput).toBe("value-out");
        expect(connections[0].target).toBe("target");
        expect(connections[0].targetInput).toBe("value-in");
        expect(typeof connections[0].id).toBe("string");
        expect(connections[0].id.length).toBeGreaterThan(0);
        expect(flow.getPickedSocket()).toBeUndefined();
        expect(emitted[emitted.length - 1]).toMatchObject({
            type: "connectiondrop",
            data: {
                initial: outputSocket,
                socket: inputSocket,
                created: true
            }
        });
    });

    it("keeps input-to-output creation reliable through canonical direction normalization", async () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const context = createFlowContextForEditor(editor, emitted);
        const flow = new ClickToArmConnectionFlow({
            makeConnection: (from, to, flowContext) => createReteConnectionFromSockets(flowContext.editor as any, from, to)
        });

        // When
        await flow.pick({socket: inputSocket, event: "down"}, context);
        await flow.pick({socket: outputSocket, event: "down"}, context);

        // Then
        expect(connections).toHaveLength(1);
        expect(connections[0].sourceOutput).toBe("value-out");
        expect(connections[0].targetInput).toBe("value-in");
        expect(emitted[emitted.length - 1].data.created).toBe(true);
    });

    it("does not add an exact duplicate client-side connection", () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);

        // When
        const first = createReteConnectionFromSockets(editor, outputSocket, inputSocket);
        const duplicate = createReteConnectionFromSockets(editor, outputSocket, inputSocket);

        // Then
        expect(first).toBe(true);
        expect(duplicate).toBeUndefined();
        expect(connections).toHaveLength(1);
    });

    it("does not add an exact duplicate through the click-to-arm client flow", async () => {
        // Given
        const sourceNode = new ReteNode("editor", {
            id: "source",
            pins: [valueOutput]
        });
        const targetNode = new ReteNode("editor", {
            id: "target",
            pins: [valueInput]
        });
        const connections: any[] = [{
            source: "source",
            sourceOutput: "value-out",
            target: "target",
            targetInput: "value-in"
        }];
        const editor = createEditorForNodes([sourceNode, targetNode], connections);
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const context = createFlowContextForEditor(editor, emitted);
        const flow = new ClickToArmConnectionFlow({
            makeConnection: (from, to, flowContext) => createReteConnectionFromSockets(flowContext.editor as any, from, to)
        });

        // When
        await flow.pick({socket: outputSocket, event: "down"}, context);
        await flow.pick({socket: inputSocket, event: "down"}, context);

        // Then
        expect(connections).toHaveLength(1);
        expect(flow.getPickedSocket()).toBe(outputSocket);
        expect(emitted.map(event => event.type)).toEqual(["connectionpick", "connectionreject"]);
        expect(emitted[1].data).toMatchObject({
            initial: outputSocket,
            socket: inputSocket,
            created: false
        });
    });

    it("detaches an occupied input through the editor removeConnection path", async () => {
        // Given
        const existingConnection = {
            id: "connection-1",
            source: "source",
            sourceOutput: "value-out",
            target: "target",
            targetInput: "value-in"
        };
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const inputSocket = createSocket("target", "value-in", "input", valueInput);
        const emitted: any[] = [];
        const removeConnection = jest.fn(async () => true);
        const context = createFlowContext([existingConnection], emitted, [outputSocket, inputSocket], removeConnection);
        const flow = new ClickToArmConnectionFlow({
            makeConnection: jest.fn()
        });

        // When
        await flow.pick({socket: inputSocket, event: "down"}, context);

        // Then
        expect(removeConnection).toHaveBeenCalledWith("connection-1");
        expect(flow.getPickedSocket()).toBe(outputSocket);
        expect(emitted).toContainEqual({
            type: "connectionpick",
            data: {
                socket: outputSocket
            }
        });
    });

    it("arms the output launcher menu option selected by menu index", () => {
        // Given
        const alternateOutput: RetePinParams = {
            ...valueOutput,
            id: "value-out-2",
            menuOrder: 2
        };
        const selections: string[] = [];
        const controller = createReteOutputLauncherMenuController([
            {key: valueOutput.id, pin: valueOutput, index: 0},
            {key: alternateOutput.id, pin: alternateOutput, index: 1}
        ], {
            select: option => selections.push(option.pin.id),
            close: jest.fn()
        });

        // When
        controller.select(1);

        // Then
        expect(selections).toEqual(["value-out-2"]);
    });

    it("conceals advanced pins only until they are connected, selected, or compatible", () => {
        // Given
        const advancedInput: RetePinParams = {
            ...valueInput,
            id: "advanced-value-in",
            isAdvanced: true
        };

        // When / Then
        expect(shouldConcealAdvancedPin(advancedInput)).toBe(true);
        expect(shouldConcealAdvancedPin(advancedInput, {connected: true})).toBe(false);
        expect(shouldConcealAdvancedPin(advancedInput, {selected: true})).toBe(false);
        expect(shouldConcealAdvancedPin(advancedInput, {compatible: true})).toBe(false);
        expect(shouldConcealAdvancedPin(valueInput)).toBe(false);
    });

    it("keeps advanced pins hidden and disabled unless the active drag makes them compatible", async () => {
        // Given
        const pins = createBtLikeRegionPins();
        const harness = createMagneticDomHarness();
        const incompatibleAdvancedInput: RetePinParams = {
            ...pins.targetRegionInput,
            id: "advanced-boolean-input",
            name: "Advanced boolean",
            valueTypeId: "boolean"
        };
        const sourceElement = harness.createSocketElement(pins.windowRegionOutput);
        const compatibleElement = harness.createSocketElement(pins.targetRegionInput);
        const incompatibleElement = harness.createSocketElement(incompatibleAdvancedInput);
        const sourceSocket = createSocketWithElement("image-search", "window-region", "output", pins.windowRegionOutput, sourceElement);
        const compatibleSocket = createSocketWithElement("mouse-move", "target-region", "input", pins.targetRegionInput, compatibleElement);
        const incompatibleSocket = createSocketWithElement("boolean-node", "advanced-boolean-input", "input", incompatibleAdvancedInput, incompatibleElement);

        // When
        await harness.renderSocket(sourceSocket);
        await harness.renderSocket(compatibleSocket);
        await harness.renderSocket(incompatibleSocket);

        // Then
        expect(shouldConcealAdvancedPin(pins.targetRegionInput)).toBe(true);
        expect(shouldConcealAdvancedPin(incompatibleAdvancedInput)).toBe(true);
        expect(compatibleElement.classList.contains("rete-pin-compatible")).toBe(false);
        expect(incompatibleElement.classList.contains("rete-pin-compatible")).toBe(false);

        // When
        await harness.flow.pick({socket: sourceSocket, event: "down"}, harness.createFlowContext());

        // Then
        expect(compatibleElement.classList.contains("pin-advanced-concealable")).toBe(true);
        expect(compatibleElement.classList.contains("rete-pin-compatible")).toBe(true);
        expect(compatibleElement.getAttribute("data-pin-compatibility")).toBe("compatible");
        expect(compatibleElement.getAttribute("data-pin-disabled")).toBeUndefined();
        expect(shouldConcealAdvancedPin(pins.targetRegionInput, {
            compatible: compatibleElement.classList.contains("rete-pin-compatible")
        })).toBe(false);
        expect(incompatibleElement.classList.contains("pin-advanced-concealable")).toBe(true);
        expect(incompatibleElement.classList.contains("rete-pin-compatible")).toBe(false);
        expect(incompatibleElement.getAttribute("data-pin-compatibility")).toBe("incompatible");
        expect(incompatibleElement.getAttribute("data-pin-compatibility-reason")).toBe("value-type");
        expect(incompatibleElement.getAttribute("data-pin-disabled")).toBe("true");
        expect(incompatibleElement.getAttribute("aria-disabled")).toBe("true");
        expect(shouldConcealAdvancedPin(incompatibleAdvancedInput, {
            compatible: incompatibleElement.classList.contains("rete-pin-compatible")
        })).toBe(true);
    });

    it("reveals every concealable socket wrapper when an advanced pin becomes compatible", async () => {
        // Given
        const pins = createBtLikeRegionPins();
        const harness = createMagneticDomHarness();
        const sourceElement = harness.createSocketElement(pins.windowRegionOutput);
        const targetDom = harness.createNestedConcealableSocketElement(pins.targetRegionInput);
        const sourceSocket = createSocketWithElement("image-search", "window-region", "output", pins.windowRegionOutput, sourceElement);
        const targetSocket = createSocketWithElement("mouse-move", "target-region", "input", pins.targetRegionInput, targetDom.renderRoot);

        // When
        await harness.renderSocket(sourceSocket);
        await harness.renderSocket(targetSocket);
        await harness.flow.pick({socket: sourceSocket, event: "down"}, harness.createFlowContext());

        // Then
        expect(targetDom.socketPort.classList.contains("rete-pin-compatible")).toBe(true);
        expect(targetDom.hoverable.classList.contains("rete-pin-compatible")).toBe(true);
        expect(targetDom.socketElement.classList.contains("rete-pin-compatible")).toBe(true);
        expect(targetDom.socketPort.getAttribute("data-pin-hidden")).toBeUndefined();
        expect(targetDom.hoverable.getAttribute("data-pin-hidden")).toBeUndefined();
        expect(targetDom.socketElement.getAttribute("data-pin-hidden")).toBeUndefined();
        expect(targetDom.socketPort.style.opacity).toBe("1");
        expect(targetDom.hoverable.style.opacity).toBe("1");
        expect(targetDom.socketElement.style.opacity).toBe("1");
        expect(targetDom.socketPort.style.pointerEvents).toBe("auto");
        expect(targetDom.hoverable.style.pointerEvents).toBe("auto");
        expect(targetDom.socketElement.style.pointerEvents).toBe("auto");
    });

    it("keeps same-node connection attempts silent in the pending connection label", async () => {
        // Given
        const outputPin: RetePinParams = {
            ...valueOutput,
            id: "same-node-output",
            name: "Same node output"
        };
        const inputPin: RetePinParams = {
            ...valueInput,
            id: "same-node-input",
            name: "Same node input"
        };
        const harness = createMagneticDomHarness();
        harness.createNodeView("image-search");
        const outputElement = harness.createSocketElement(outputPin);
        const inputElement = harness.createSocketElement(inputPin);
        const outputSocket = createSocketWithElement("image-search", "same-node-output", "output", outputPin, outputElement);
        const inputSocket = createSocketWithElement("image-search", "same-node-input", "input", inputPin, inputElement);

        // When
        await harness.renderSocket(outputSocket);
        await harness.renderSocket(inputSocket);
        await harness.flow.pick({socket: outputSocket, event: "down"}, harness.createFlowContext());
        await harness.flow.pick({socket: inputSocket, event: "down"}, harness.createFlowContext());

        // Then
        const label = harness.document.body.querySelector(".rete-pending-connection-label");
        expect(label?.querySelector(".rete-pending-connection-label__main")?.textContent ?? "").not.toContain("Same node");
        expect(label?.querySelector(".rete-pending-connection-label__warning")).toBeUndefined();
        expect(label?.getAttribute("data-connection-warning")).toBeUndefined();
        expect(label?.getAttribute("data-target-node-id")).toBeUndefined();
    });

    it("renders pending label metadata and clears advanced pin reveal state on Escape", async () => {
        // Given
        const pins = createBtLikeRegionPins();
        const harness = createMagneticDomHarness();
        const sourcePin = {
            ...pins.windowRegionOutput,
            previewText: "120,90 40x30",
            previewChangedAt: "2026-05-06T12:34:56Z"
        };
        const incompatiblePin: RetePinParams = {
            id: "boolean-input",
            name: "Boolean input",
            family: "value",
            direction: "input",
            valueTypeId: "boolean",
            coordinateTypeId: "window"
        };
        const sourceNodeElement = harness.createNodeView("image-search");
        const targetNodeElement = harness.createNodeView("mouse-move");
        const incompatibleNodeElement = harness.createNodeView("boolean-node");
        const sourceElement = harness.createSocketElement(sourcePin);
        const targetElement = harness.createSocketElement(pins.targetRegionInput);
        const incompatibleNodeSocketElement = harness.createSocketElement(incompatiblePin);
        const sourceSocket = createSocketWithElement("image-search", "window-region", "output", sourcePin, sourceElement);
        const targetSocket = createSocketWithElement("mouse-move", "target-region", "input", pins.targetRegionInput, targetElement);
        const incompatibleNodeSocket = createSocketWithElement("boolean-node", "boolean-input", "input", incompatiblePin, incompatibleNodeSocketElement);

        // When
        await harness.renderSocket(sourceSocket);
        await harness.renderSocket(targetSocket);
        await harness.renderSocket(incompatibleNodeSocket);
        await harness.flow.pick({socket: sourceSocket, event: "down"}, harness.createFlowContext());

        // Then
        const label = harness.document.body.querySelector(".rete-pending-connection-label")!;
        const main = label.querySelector(".rete-pending-connection-label__main") as unknown as HTMLElement;
        expect(label).toBeDefined();
        expect(main.style.display).toBe("grid");
        expect(main.style.gridAutoFlow).toBe("column");
        expect(label.querySelector(".rete-pending-connection-label__source-node")?.textContent).toBe("ImageSearch");
        expect(label.querySelector(".rete-pending-connection-label__source-pin")?.textContent).toBe("ImageSearch Region");
        expect((label.querySelector(".rete-pending-connection-label__source-pin") as any)?.style.fontStyle).toBe("italic");
        expect(label.querySelector(".rete-pending-connection-label__target-node")).toBeUndefined();
        expect(label.querySelector(".rete-pending-connection-label__target-pin")).toBeUndefined();
        expect(main.textContent).not.toContain("window-region");
        expect(label.querySelector(".rete-pending-connection-label__preview")?.textContent).toBe("Value: 120,90 40x30 (2026-05-06T12:34:56Z)");
        expect(label.title).toBe("ImageSearch -> Value: 120,90 40x30 (2026-05-06T12:34:56Z)");
        expect(label.title).not.toContain("window-region");
        expect(label.style.position).toBe("fixed");
        expect(label.style.left).toBe("8px");
        expect(label.style.top).toBe("8px");
        expect(label.style.textAlign).toBe("left");
        expect(label.style.background).toBe("transparent");
        expect(label.style.boxShadow).toBe("none");
        expect(label.getAttribute("data-in-progress")).toBe("true");
        expect(label.getAttribute("data-position-anchor")).toBe("pane-top-left");
        expect(label.getAttribute("data-node-id")).toBe("image-search");
        expect(label.getAttribute("data-node-label")).toBe("ImageSearch");
        expect(label.getAttribute("data-pin-id")).toBe("window-region");
        expect(label.getAttribute("data-pin-name")).toBe("ImageSearch Region");
        expect(label.getAttribute("data-pin-family")).toBe("value");
        expect(label.getAttribute("data-value-type-id")).toBe("region");
        expect(label.getAttribute("data-coordinate-type-id")).toBe("window");
        expect(label.getAttribute("data-pin-preview")).toBe("120,90 40x30 - 2026-05-06T12:34:56Z");
        expect(label.getAttribute("data-pin-preview-changed-at")).toBe("2026-05-06T12:34:56Z");
        expect(targetElement.classList.contains("pin-advanced-concealable")).toBe(true);
        expect(targetElement.classList.contains("rete-pin-compatible")).toBe(true);
        expect(targetElement.getAttribute("data-pin-compatibility")).toBe("compatible");
        expect(sourceNodeElement.getAttribute("data-node-compatibility")).toBe("picked");
        expect(targetNodeElement.getAttribute("data-node-compatibility")).toBe("compatible");
        expect(incompatibleNodeElement.getAttribute("data-node-compatibility")).toBe("incompatible");
        expect(incompatibleNodeElement.getAttribute("data-node-disabled")).toBe("true");
        expect(incompatibleNodeElement.style.opacity).toBe("0.32");
        expect(shouldConcealAdvancedPin(pins.targetRegionInput, {
            compatible: targetElement.classList.contains("rete-pin-compatible")
        })).toBe(false);

        // When
        const incompatibleElement = harness.createSocketElement(incompatiblePin);
        const incompatibleSocket = createSocketWithElement("mouse-move", "boolean-input", "input", incompatiblePin, incompatibleElement);
        await harness.renderSocket(incompatibleSocket);
        await harness.connection.emit({
            type: "connectionreject",
            data: {
                initial: sourceSocket,
                socket: incompatibleSocket,
                created: false
            }
        });

        // Then
        expect(label.querySelector(".rete-pending-connection-label__source-node")?.textContent).toBe("ImageSearch");
        expect(label.querySelector(".rete-pending-connection-label__source-pin")?.textContent).toBe("ImageSearch Region");
        expect(label.querySelector(".rete-pending-connection-label__target-node")?.textContent).toBe("MouseMove");
        expect(label.querySelector(".rete-pending-connection-label__target-pin")?.textContent).toBe("Boolean input");
        expect(label.querySelector(".rete-pending-connection-label__main")?.textContent).not.toContain("window-region");
        expect(label.querySelector(".rete-pending-connection-label__main")?.textContent).not.toContain("boolean-input");
        const warningText = label.querySelector(".rete-pending-connection-label__warning")?.textContent;
        expect(warningText).toContain("ImageSearch");
        expect(warningText).toContain("MouseMove");
        expect(warningText).not.toContain("ImageSearch Region");
        expect(warningText).not.toContain("Boolean input");
        expect(warningText).not.toContain("window-region");
        expect(warningText).not.toContain("boolean-input");
        expect(warningText).not.toContain("region");
        expect(warningText).not.toContain("boolean");
        expect(label.getAttribute("data-connection-compatibility")).toBe("incompatible");
        expect(label.getAttribute("data-connection-compatibility-reason")).toBe("value-type");
        expect(label.getAttribute("data-connection-warning")).toBe(warningText);
        expect(label.getAttribute("data-target-node-id")).toBe("mouse-move");
        expect(label.getAttribute("data-target-pin-id")).toBe("boolean-input");
        expect(label.style.borderColor).toBe("rgba(248, 113, 113, 0.75)");
        expect(incompatibleElement.getAttribute("data-pin-disabled")).toBe("true");
        expect(incompatibleElement.getAttribute("aria-disabled")).toBe("true");

        // When
        const escape = createKeyboardEvent("Escape");
        harness.document.dispatchEvent(escape);
        await flushPromises();

        // Then
        expect(escape.preventDefault).toHaveBeenCalledTimes(1);
        expect(harness.connection.drop).toHaveBeenCalledTimes(1);
        expect(harness.document.body.querySelector(".rete-pending-connection-label")).toBeUndefined();
        expect(sourceElement.classList.contains("rete-pin-picked")).toBe(false);
        expect(targetElement.classList.contains("rete-pin-compatible")).toBe(false);
        expect(targetElement.getAttribute("data-pin-compatibility")).toBeUndefined();
        expect(shouldConcealAdvancedPin(pins.targetRegionInput, {
            compatible: targetElement.classList.contains("rete-pin-compatible")
        })).toBe(true);
    });
});

describe("Rete magnetic preview path orientation", () => {
    const valueOutput: RetePinParams = {
        id: "value-out",
        family: "value",
        direction: "output",
        side: "right",
        valueTypeId: "boolean"
    };
    const ordinaryInput: RetePinParams = {
        id: "value-in",
        family: "value",
        direction: "input",
        side: "left",
        valueTypeId: "boolean"
    };
    const preConditionInput: RetePinParams = {
        id: "pre-condition",
        family: "value",
        direction: "input",
        side: "top",
        valueTypeId: "boolean",
        pinRole: "condition"
    };
    const postConditionInput: RetePinParams = {
        id: "post-condition",
        family: "value",
        direction: "input",
        side: "bottom",
        valueTypeId: "boolean",
        pinRole: "condition"
    };

    it("records canonical source and target sides for output-to-input magnetic previews", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const postConditionSocket = createSocket("target", "post-condition", "input", postConditionInput);

        // When
        const metadata = createMagneticConnectionPathMetadata(outputSocket, postConditionSocket);

        // Then
        expect(metadata).toMatchObject({
            isMagnetic: true,
            sourceNodeId: "source",
            sourcePinId: "value-out",
            sourcePinSide: "right",
            targetNodeId: "target",
            targetPinId: "post-condition",
            targetPinSide: "bottom"
        });
    });

    it("records the same canonical sides for input-to-output drag gestures", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const preConditionSocket = createSocket("target", "pre-condition", "input", preConditionInput);

        // When
        const metadata = createMagneticConnectionPathMetadata(preConditionSocket, outputSocket);

        // Then
        expect(metadata).toMatchObject({
            sourceNodeId: "source",
            sourcePinId: "value-out",
            sourcePinSide: "right",
            targetNodeId: "target",
            targetPinId: "pre-condition",
            targetPinSide: "top"
        });
    });

    it("keeps the source tangent horizontal-right and the post-condition target tangent vertical-bottom", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const postConditionSocket = createSocket("target", "post-condition", "input", postConditionInput);
        const start = {x: 100, y: 120};
        const end = {x: 260, y: 240};

        // When
        const points = createMagneticPreviewConnectionPathPoints([start, end], outputSocket, postConditionSocket);

        // Then
        expect(points).toHaveLength(4);
        expect(points[1].x).toBeGreaterThan(start.x);
        expect(points[1].y).toBeCloseTo(start.y);
        expect(points[1].x - start.x).toBeGreaterThan(Math.abs(points[1].y - start.y) * 3);
        expect(points[2].x).toBeCloseTo(end.x);
        expect(points[2].y).toBeGreaterThan(end.y);
        expect(points[2].y - end.y).toBeGreaterThan(Math.abs(points[2].x - end.x) * 2);
    });

    it("stamps the pseudo preview payload with snapped endpoint side metadata", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const preConditionSocket = createSocket("target", "pre-condition", "input", preConditionInput);
        const payload = {};

        // When
        applyMagneticConnectionPathMetadata(payload, outputSocket, preConditionSocket);

        // Then
        expect(payload).toEqual({
            isMagnetic: true,
            sourceNodeId: "source",
            sourcePinId: "value-out",
            sourcePinSide: "right",
            targetNodeId: "target",
            targetPinId: "pre-condition",
            targetPinSide: "top"
        });
    });

    it("keeps ordinary inputs on the left and route pins on their route sides", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const ordinarySocket = createSocket("target", "value-in", "input", ordinaryInput);
        const routeOutputSocket = createSocket("route-source", "route-out", "output", {
            id: "route-out",
            family: "route",
            direction: "output"
        });
        const routeInputSocket = createSocket("route-target", "route-in", "input", {
            id: "route-in",
            family: "route",
            direction: "input"
        });

        // When
        const ordinaryMetadata = createMagneticConnectionPathMetadata(outputSocket, ordinarySocket);
        const routeMetadata = createMagneticConnectionPathMetadata(routeOutputSocket, routeInputSocket);

        // Then
        expect(ordinaryMetadata?.sourcePinSide).toBe("right");
        expect(ordinaryMetadata?.targetPinSide).toBe("left");
        expect(routeMetadata?.sourcePinSide).toBe("bottom");
        expect(routeMetadata?.targetPinSide).toBe("top");
    });

    it("clears stale preview endpoint metadata when there is no magnetic target", () => {
        // Given
        const outputSocket = createSocket("source", "value-out", "output", valueOutput);
        const ordinarySocket = createSocket("target", "value-in", "input", ordinaryInput);
        const metadata = {};
        applyMagneticConnectionPathMetadata(metadata, outputSocket, ordinarySocket);

        // When
        applyMagneticConnectionPathMetadata(metadata);

        // Then
        expect(metadata).toEqual({isMagnetic: true});
    });
});

function createSocket(
    nodeId: string,
    key: string,
    side: "input" | "output",
    pin: RetePinParams
): ReteSocketData {
    return {
        element: {id: `${nodeId}-${key}`} as HTMLElement,
        type: "socket",
        nodeId,
        key,
        side,
        pin
    };
}

function createSocketWithElement(
    nodeId: string,
    key: string,
    side: "input" | "output",
    pin: RetePinParams,
    element: HTMLElement
): ReteSocketData {
    return {
        element,
        type: "socket",
        nodeId,
        key,
        side,
        pin
    };
}

function createBtLikeRegionPins() {
    const windowRegionOutput: RetePinParams = {
        id: "window-region",
        name: "ImageSearch Region",
        family: "value",
        direction: "output",
        valueTypeId: "region",
        coordinateTypeId: "window",
        isPrimary: true,
        menuOrder: 1
    };
    const targetRegionInput: RetePinParams = {
        id: "target-region",
        name: "Mouse Target",
        family: "value",
        direction: "input",
        valueTypeId: "region",
        coordinateTypeId: "window",
        isAdvanced: true,
        menuOrder: 1
    };

    return {
        windowRegionOutput,
        targetRegionInput
    };
}

function createEditor(connections: any[] = []) {
    return {
        getConnections: () => connections,
        getNode: (id: string) => ({
            id,
            label: id === "target" ? "Target node" : "Source node",
            editorId: "editor"
        })
    } as any;
}

function createEditorForNodes(nodes: any[], connections: any[] = []) {
    return {
        getConnections: () => connections,
        getNode: (id: string) => nodes.find(node => node.id === id),
        addConnection: async (connection: any) => {
            connections.push(connection);
            return true;
        }
    } as any;
}

function createListenerAreaStub() {
    return {
        addPipe: jest.fn(),
        nodeViews: new Map()
    } as any;
}

function createFlowContext(
    connections: any[],
    emitted: any[],
    sockets: ReteSocketData[] = [],
    removeConnection: (id: string) => Promise<boolean> = jest.fn(async () => true)
) {
    return {
        editor: {
            getConnections: () => connections,
            removeConnection
        },
        scope: {
            emit: async (event: any) => {
                emitted.push(event);
                return true;
            }
        },
        socketsCache: new Map(sockets.map(socket => [socket.element, socket]))
    } as any;
}

function createMagneticDomHarness(connections: any[] = []) {
    const document = new FakeDocument();
    const container = document.createElement("div");
    document.body.appendChild(container);

    const registeredSockets: ReteSocketData[] = [];
    const connectionPipes: Array<(context: any) => any> = [];
    const editor = {
        getConnections: () => connections,
        getNode: (id: string) => ({
            id,
            label: id === "mouse-move" ? "MouseMove" : "ImageSearch",
            editorId: "editor"
        }),
        addPipe: jest.fn(),
        addConnection: async (connection: any) => {
            connections.push(connection);
            return true;
        },
        removeConnection: jest.fn(async (id: string) => {
            const index = connections.findIndex(connection => connection.id === id);
            if (index < 0) {
                return false;
            }

            connections.splice(index, 1);
            return true;
        })
    };
    const area = {
        container,
        area: {
            pointer: {x: 0, y: 0},
            transform: {x: 0, y: 0, k: 1}
        },
        nodeViews: new Map(),
        parentScope: () => editor
    };
    const connection = {
        parentScope: () => area,
        addPipe: (pipe: (context: any) => any) => {
            connectionPipes.push(pipe);
        },
        emit: async (event: any) => {
            let context = event;
            for (const pipe of connectionPipes) {
                context = await pipe(context);
            }

            return true;
        },
        drop: jest.fn()
    };
    const flow = new ClickToArmConnectionFlow({
        makeConnection: jest.fn(() => true)
    });

    useMagneticConnection(connection as any, {
        createConnection: jest.fn(),
        display: jest.fn(() => true),
        offset: (_socket: ReteSocketData, position: {x: number; y: number}) => position
    }, flow as any);

    return {
        document,
        connection,
        flow,
        createSocketElement(pin: RetePinParams): HTMLElement {
            const element = document.createElement("div");
            const pinElement = document.createElement("div");
            element.setAttribute("data-pin-id", pin.id);
            pinElement.setAttribute("data-pin-id", pin.id);
            pinElement.setAttribute("data-pin-family", pin.family);
            pinElement.setAttribute("data-pin-direction", pin.direction);
            pinElement.classList.add("rete-pin-socket");
            if (pin.isAdvanced) {
                element.classList.add("pin-advanced-concealable");
                pinElement.classList.add("pin-advanced");
                pinElement.classList.add("pin-advanced-concealable");
            }

            element.appendChild(pinElement);
            container.appendChild(element);
            return element as any;
        },
        createNestedConcealableSocketElement(pin: RetePinParams): {
            renderRoot: HTMLElement;
            socketPort: HTMLElement;
            hoverable: HTMLElement;
            socketElement: HTMLElement;
        } {
            const renderRoot = document.createElement("div");
            const socketPort = document.createElement("div");
            const hoverable = document.createElement("div");
            const socketElement = document.createElement("div");
            socketPort.classList.add("socket-port");
            socketPort.setAttribute("data-pin-id", pin.id);
            socketPort.setAttribute("data-pin-family", pin.family ?? "");
            socketPort.setAttribute("data-pin-direction", pin.direction);
            hoverable.classList.add("rete-pin-socket");
            hoverable.setAttribute("data-pin-id", pin.id);
            hoverable.setAttribute("data-pin-family", pin.family ?? "");
            hoverable.setAttribute("data-pin-direction", pin.direction);
            socketElement.classList.add("rete-pin-socket");
            socketElement.setAttribute("data-pin-id", pin.id);
            socketElement.setAttribute("data-pin-family", pin.family ?? "");
            socketElement.setAttribute("data-pin-direction", pin.direction);

            if (pin.isAdvanced) {
                for (const element of [socketPort, hoverable, socketElement]) {
                    element.classList.add("pin-advanced-concealable");
                    element.setAttribute("data-pin-hidden", "true");
                    element.setAttribute("aria-hidden", "true");
                }

                socketElement.classList.add("pin-advanced");
            }

            hoverable.appendChild(socketElement);
            socketPort.appendChild(hoverable);
            renderRoot.appendChild(socketPort);
            container.appendChild(renderRoot);
            return {
                renderRoot: renderRoot as unknown as HTMLElement,
                socketPort: socketPort as unknown as HTMLElement,
                hoverable: hoverable as unknown as HTMLElement,
                socketElement: socketElement as unknown as HTMLElement
            };
        },
        async renderSocket(socket: ReteSocketData): Promise<void> {
            registeredSockets.push(socket);
            await connection.emit({
                type: "render",
                data: {
                    ...socket,
                    type: "socket"
                }
            });
        },
        createFlowContext() {
            return {
                editor,
                scope: connection,
                socketsCache: new Map(registeredSockets.map(socket => [socket.element, socket]))
            } as any;
        },
        createNodeView(nodeId: string): HTMLElement {
            const element = document.createElement("div");
            area.nodeViews.set(nodeId, {
                element,
                position: {x: 0, y: 0}
            });
            container.appendChild(element);
            return element as any;
        }
    };
}

function createKeyboardEvent(key: string) {
    return {
        type: "keydown",
        key,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
    };
}

async function flushPromises(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

class FakeClassList {
    private readonly values = new Set<string>();

    public add(...classNames: string[]): void {
        classNames.forEach(className => this.values.add(className));
    }

    public remove(...classNames: string[]): void {
        classNames.forEach(className => this.values.delete(className));
    }

    public contains(className: string): boolean {
        return this.values.has(className);
    }

    public toString(): string {
        return Array.from(this.values).join(" ");
    }
}

class FakeElement {
    public readonly classList = new FakeClassList();
    public readonly style: Record<string, string> = {};
    public readonly children: FakeElement[] = [];
    public readonly listeners = new Map<string, Array<(event: any) => void>>();
    public textContent = "";
    public title = "";
    public parentElement?: FakeElement;
    private readonly attributes = new Map<string, string>();

    constructor(
        public readonly tagName: string,
        public readonly ownerDocument: FakeDocument
    ) {
    }

    public get className(): string {
        return this.classList.toString();
    }

    public set className(value: string) {
        value.split(/\s+/)
            .filter(Boolean)
            .forEach(className => this.classList.add(className));
    }

    public appendChild(child: FakeElement): FakeElement {
        child.parentElement = this;
        this.children.push(child);
        this.textContent += child.textContent;
        return child;
    }

    public append(...items: Array<FakeElement | string>): void {
        items.forEach(item => {
            if (typeof item === "string") {
                this.textContent += item;
                return;
            }

            this.appendChild(item);
        });
    }

    public replaceChildren(...items: Array<FakeElement | string>): void {
        this.children.forEach(child => child.parentElement = undefined);
        this.children.length = 0;
        this.textContent = "";
        this.append(...items);
    }

    public remove(): void {
        if (!this.parentElement) {
            return;
        }

        const siblings = this.parentElement.children;
        const index = siblings.indexOf(this);
        if (index >= 0) {
            siblings.splice(index, 1);
        }

        this.parentElement = undefined;
    }

    public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
    }

    public getAttribute(name: string): string | undefined {
        return this.attributes.get(name);
    }

    public removeAttribute(name: string): void {
        this.attributes.delete(name);
    }

    public querySelector(selector: string): FakeElement | undefined {
        for (const child of this.children) {
            if (child.matches(selector)) {
                return child;
            }

            const match = child.querySelector(selector);
            if (match) {
                return match;
            }
        }

        return undefined;
    }

    public querySelectorAll(selector: string): FakeElement[] {
        const results: FakeElement[] = [];
        for (const child of this.children) {
            if (child.matches(selector)) {
                results.push(child);
            }

            results.push(...child.querySelectorAll(selector));
        }

        return results;
    }

    public contains(target: FakeElement): boolean {
        return target === this || this.children.some(child => child.contains(target));
    }

    public addEventListener(type: string, listener: (event: any) => void): void {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    public removeEventListener(type: string, listener: (event: any) => void): void {
        const listeners = this.listeners.get(type) ?? [];
        this.listeners.set(type, listeners.filter(item => item !== listener));
    }

    public dispatchEvent(event: any): boolean {
        (this.listeners.get(event.type) ?? []).forEach(listener => listener(event));
        return true;
    }

    public getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            right: 16,
            bottom: 16,
            width: 16,
            height: 16
        };
    }

    public focus(): void {
    }

    private matches(selector: string): boolean {
        if (selector.includes(",")) {
            return selector.split(",").some(part => this.matches(part.trim()));
        }

        if (selector.startsWith(".")) {
            return this.classList.contains(selector.slice(1));
        }

        if (selector === "[data-pin-id]") {
            return this.attributes.has("data-pin-id");
        }

        return false;
    }
}

class FakeDocument {
    public readonly body: FakeElement;
    public readonly defaultView: {
        innerWidth: number;
        innerHeight: number;
        addEventListener: (type: string, listener: (event: any) => void) => void;
        removeEventListener: (type: string, listener: (event: any) => void) => void;
    };
    private readonly listeners = new Map<string, Array<(event: any) => void>>();

    constructor() {
        this.body = new FakeElement("body", this);
        this.defaultView = {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: (type, listener) => this.addEventListener(type, listener),
            removeEventListener: (type, listener) => this.removeEventListener(type, listener)
        };
    }

    public createElement(tagName: string): FakeElement {
        return new FakeElement(tagName, this);
    }

    public addEventListener(type: string, listener: (event: any) => void): void {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    public removeEventListener(type: string, listener: (event: any) => void): void {
        const listeners = this.listeners.get(type) ?? [];
        this.listeners.set(type, listeners.filter(item => item !== listener));
    }

    public dispatchEvent(event: any): boolean {
        (this.listeners.get(event.type) ?? []).forEach(listener => listener(event));
        return true;
    }

    public elementsFromPoint(): FakeElement[] {
        return [];
    }
}

function createFlowContextForEditor(
    editor: any,
    emitted: any[],
    sockets: ReteSocketData[] = []
) {
    return {
        editor,
        scope: {
            emit: async (event: any) => {
                emitted.push(event);
                return true;
            }
        },
        socketsCache: new Map(sockets.map(socket => [socket.element, socket]))
    } as any;
}
