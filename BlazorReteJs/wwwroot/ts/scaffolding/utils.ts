import {Position, Rect, ReteNode} from "../rete-editor-shared";
import {NodeView} from "rete-area-plugin";

export function sortByIndex<T extends [string, undefined | { index?: number }][]>(
    entries: T
) {
    entries.sort((a, b) => {
        const ai = a[1]?.index || 0;
        const bi = b[1]?.index || 0;

        return ai - bi;
    });
}

export function getNodeRect(node: ReteNode, view: NodeView) {
    const {
        position: { x, y }
    } = view;

    return {
        left: x,
        top: y,
        right: x + node.width,
        bottom: y + node.height
    };
}


export function findNearestPoint<T extends Position>(
    points: T[],
    target: Position,
    maxDistance: number
) {
    return points.reduce((nearestPoint, point) => {
        const distance = Math.sqrt(
            (point.x - target.x) ** 2 + (point.y - target.y) ** 2
        );

        if (distance > maxDistance) return nearestPoint;
        if (nearestPoint === null || distance < nearestPoint.distance)
            return { point, distance };
        return nearestPoint;
    }, null as null | { point: T; distance: number })?.point;
}

export function isInsideRect(rect: Rect, point: Position, margin: number) {
    const isInside =
        point.y > rect.top - margin &&
        point.x > rect.left - margin &&
        point.x < rect.right + margin &&
        point.y < rect.bottom + margin;

    return isInside;
}