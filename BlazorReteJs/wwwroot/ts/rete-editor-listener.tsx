import {NodeEditor, Root} from "rete";
import {Area2D, AreaPlugin} from "rete-area-plugin";
import {AreaExtra, ReteNodePosition, Schemes} from './rete-editor-shared'
import * as log from 'loglevel';

import {
    bufferTime,
    distinctUntilChanged,
    filter,
    groupBy,
    map,
    merge,
    mergeMap,
    Observable,
    Subject,
    Subscription,
    tap
} from 'rxjs';
import {RxObservableCollection} from "./collections/rx-observable-collection";

export class ReteEditorListener {
    private readonly logger: log.Logger = log.getLogger(ReteEditorListener.name);

    private readonly editor: NodeEditor<Schemes>;
    private readonly areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly anchors: Subscription = new Subscription();
    private readonly nodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly selectedNodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly connections: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly areaEventSink: Subject<AreaExtra | Root<Schemes> | Area2D<Schemes>> = new Subject<AreaExtra | Root<Schemes> | Area2D<Schemes>>();
    private readonly editorEventSink: Subject<Root<Schemes>> = new Subject<Root<Schemes>>();

    constructor(editor: NodeEditor<Schemes>, areaPlugin: AreaPlugin<Schemes, AreaExtra>) {
        this.logger.setLevel(log.levels.INFO);

        this.editor = editor;
        this.areaPlugin = areaPlugin;

        this.anchors.add(this.selectionObservable()
            .pipe(tap(() => this.updateSelection()))
            .subscribe());

        this.editor.addPipe(ctx => {
            if (ctx.type === 'nodecreated') {
                this.nodes.add(ctx.data.id);
            }

            if (ctx.type === 'noderemoved') {
                this.nodes.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared') {
                this.nodes.clear()
            }
            return ctx;
        });

        this.editor.addPipe(ctx => {
            if (ctx.type === 'connectioncreated') {
                this.connections.add(ctx.data.id);
            }

            if (ctx.type === 'connectionremoved') {
                this.connections.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared') {
                this.connections.clear()
            }

            return ctx;
        });

        this.editor.addPipe(ctx => {
            this.editorEventSink.next(ctx);
            return ctx;
        });

        this.areaPlugin.addPipe(ctx => {
            this.areaEventSink.next(ctx);
            return ctx;
        });
    }

    public getNodes(): RxObservableCollection<string> {
        return this.nodes;
    }

    public getNodePositionUpdatesRaw(includeTranslated?: boolean): Observable<ReteNodePosition> {
        return new Observable<ReteNodePosition>(observer => {
            const areaSubscription = this.areaEventSink.subscribe(ctx => {
                if (ctx.type === 'nodedragged') {
                    const nodeView = this.areaPlugin.nodeViews.get(ctx.data.id);
                    const position = nodeView.position;
                    this.logger.debug(`node dragged to ${JSON.stringify(position)} ${JSON.stringify(ctx.data)}`);
                    const nodeParams: ReteNodePosition = {
                        id: ctx.data.id,
                        x: nodeView.position.x,
                        y: nodeView.position.y
                    };
                    observer.next(nodeParams);
                } else if (includeTranslated && ctx.type === 'nodetranslated') {
                    const position = ctx.data.position;
                    this.logger.debug(`node moved to ${JSON.stringify(position)} ${JSON.stringify(ctx.data)}`);
                    const nodeParams: ReteNodePosition = {
                        id: ctx.data.id,
                        x: ctx.data.position.x,
                        y: ctx.data.position.y
                    };
                    observer.next(nodeParams);
                }
            });

            return () => {
                this.logger.debug("Unsubscribed!");
                areaSubscription.unsubscribe();
            };
        });
    }
    
    public getNodePositionUpdates(bufferTimeInMs?: number, includeTranslated?: boolean): Observable<ReteNodePosition[]> {
        return new Observable<ReteNodePosition[]>(observer => {
            this.logger.debug("Subscriber detected!");
            const eventSource = this.getNodePositionUpdatesRaw(includeTranslated);

            //Rete generated thousands of events about position updates
            //transporting all of them back to C# is unfeasible, that is why some buffering is required for most use-cases
            const groupedEvents = eventSource.pipe(
                groupBy(event => event.id),  // group position updates by ID
                mergeMap(group => group.pipe(
                    bufferTime(bufferTimeInMs / 2 || 0), // buffer the events in each group
                    filter(x => x.length > 0), // filter out empty buffers 
                    map(bufferedEvents => bufferedEvents[bufferedEvents.length - 1]), // and take the latest event from each buffer
                    filter(event => event !== undefined), // should never happen
                    distinctUntilChanged((prev, curr) => {
                        return prev.x === curr.x && prev.y === curr.y;
                    })
                )),
                bufferTime(bufferTimeInMs / 2 || 0), // additional buffering on multi-ID level
                filter(x => x.length > 0),
            );
            
            const subscription = groupedEvents
                .pipe(map(x => {
                    this.logger.info(`Update(${x.length}): ${JSON.stringify(x)}`);
                    return x;
                }))
                .subscribe(observer);
            return () => {
                this.logger.debug("Unsubscribed!");
                subscription.unsubscribe();
            };
        });
    }

    public getSelectedNodes(): RxObservableCollection<string> {
        return this.selectedNodes;
    }

    public getConnections(): RxObservableCollection<string> {
        return this.connections;
    }

    private selectionObservable(): Observable<any> {
        const editorEvents$ = new Observable(context => {
            this.editor.addPipe(ctx => {
                if (ctx.type === 'nodecreated' ||
                    ctx.type === 'noderemoved' ||
                    ctx.type === 'cleared') {
                    context.next(ctx.type);
                }
                return ctx;
            });
        });

        const areaPluginEvents$ = new Observable(context => {
            this.areaPlugin.addPipe(ctx => {
                if (ctx.type === 'nodepicked' ||
                    ctx.type === 'render') {
                    context.next(ctx.type);
                }
                return ctx;
            });
        });

        return merge(editorEvents$, areaPluginEvents$);
    }

    private updateSelection() {
        const currentSelectedNodes = this.editor.getNodes().filter(x => x.selected);
        const currentSelectedNodeIds = new Set(currentSelectedNodes.map(node => node.id.toString()));

        const addedNodes: string[] = [];
        const removedNodes: string[] = [];

        // Remove nodes that are no longer selected
        this.selectedNodes.getItems().forEach(nodeId => {
            if (!currentSelectedNodeIds.has(nodeId)) {
                removedNodes.push(nodeId);
            }
        });

        // Add newly selected nodes
        currentSelectedNodeIds.forEach(nodeId => {
            if (!this.selectedNodes.contains(nodeId)) {
                addedNodes.push(nodeId);
            }
        });

        // Logging changes
        if (addedNodes.length > 0 || removedNodes.length > 0) {
            if (removedNodes.length > 0) {
                //this.logger.debug(`Selection changed, removed nodes: ${removedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this.selectedNodes.removeRange(removedNodes);
            }
            if (addedNodes.length > 0) {
                //this.logger.debug(`Selection changed, added nodes: ${addedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this.selectedNodes.addRange(addedNodes);
            }
        }
    }
}