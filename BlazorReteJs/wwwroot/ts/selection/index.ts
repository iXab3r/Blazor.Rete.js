import { BaseSchemes, NodeId } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';
import intersects from 'intersects';

// @ts-ignore
import decomp from 'poly-decomp'

type Position = { x: number, y: number }

function screenToEditorCoordinates(point: Position, position: Position, zoom: number) {
    return {
        x: (point.x - position.x) / zoom,
        y: (point.y - position.y) / zoom
    }
}

function getPoint(event: PointerEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();

    const relative = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
    console.log(`getPoint: ${JSON.stringify({ clientX: event.clientX, clientY: event.clientY, rect: rect.toJSON() })}, relative: ${JSON.stringify(relative)}`)
    
    return relative
}

export type Mode = 'rect' | 'center'
export type Shape = 'lasso' | 'marquee'

type Options = {
    selected: (ids: NodeId[]) => unknown
    button?: number
    mode?: Mode
    shape?: Shape
}

export function setupSelection<S extends BaseSchemes, K>(area: AreaPlugin<S, K>, options?: Options) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const lasso = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const { container } = area
    const selected = options?.selected ?? (() => null)
    let currentButton = options?.button ?? 1
    let currentMode = options?.mode ?? 'rect'
    let currentShape = options?.shape ?? 'lasso'

    svg.appendChild(lasso);
    svg.setAttribute('id', 'lasso')
    container.appendChild(svg)


    let points: { x: number, y: number }[] = [];
    let isActive = false;

    container.addEventListener('pointerdown', start);
    container.addEventListener('pointermove', move);
    container.addEventListener('pointerup', up);

    function start(event: PointerEvent) {
        if (event.button !== currentButton) return
        isActive = true;

        points = [getPoint(event, container)];
        updatePolygon();
    }

    function move(event: any) {
        if (!isActive) return;

        if (currentShape === 'lasso') {
            points.push(getPoint(event, container));
        } else {
            const first = points[0]
            const current = getPoint(event, container)

            points = [first, { x: first.x, y: current.y }, current, { x: current.x, y: first.y }]
        }
        updatePolygon();
    }

    function intersectNodes(points: Position[]) {
        const { k } = area.area.transform
        const decompPoints = points.map(point => [point.x, point.y])

        decomp.makeCCW(decompPoints);

        const polygons = (decomp.quickDecomp(decompPoints) as [number, number][][])
            .map(polygon => polygon.flat())

        const nodes = Array.from(area.nodeViews.entries()).map(([id, view]) => {
            const rect = view.element.getBoundingClientRect()
            const { x, y } = view.position
            const width = rect.width / k
            const height = rect.height / k

            return { id, x, y, width, height }
        })

        const selectedNodes = nodes.filter(({ x, y, width, height }) => {
            return polygons.some(points => currentMode === 'rect'
                ? intersects.polygonBox(points, x, y, width, height)
                : intersects.polygonCircle(points, x + width / 2, y + height / 2, 10))
        })

        return selectedNodes
    }

    function up() {
        const { x, y, k } = area.area.transform
        const editorPoints = points.map(point => screenToEditorCoordinates(point, { x, y }, k))

        if (editorPoints.length >= 3) {
            const nodes = intersectNodes(editorPoints)

            selected(nodes.map(({ id }) => id))
        }

        isActive = false;
        points = []
        updatePolygon();
    }

    function updatePolygon() {
        const rect = container.getBoundingClientRect();
        const pointString = points.map(function (point) {
            return (point.x + rect.left) + ',' + (point.y + rect.top);
        }).join(' ');
        lasso.setAttribute('points', pointString);
        console.log(`Polygon points: ${JSON.stringify(pointString)}`)
    }

    return {
        setMode(mode: Mode) {
            currentMode = mode
        },
        setShape(shape: Shape) {
            currentShape = shape
        },
        setButton(button: 0 | 1) {
            currentButton = button
        },
        destroy: () => {
            container.removeEventListener('pointerdown', start);
            container.removeEventListener('pointermove', move);
            container.removeEventListener('pointerup', up);
        }
    }
}