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
import {ComponentParameters} from "./BlazorFacade";

export class ReteEditorListener {
    private readonly _logger: log.Logger = log.getLogger(ReteEditorListener.name);

    private readonly _editor: NodeEditor<Schemes>;
    private readonly _areaPlugin: AreaPlugin<Schemes, AreaExtra>;
    private readonly _anchors: Subscription = new Subscription();
    private readonly _nodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly _selectedNodes: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly _connections: RxObservableCollection<string> = new RxObservableCollection<string>();
    private readonly _areaEventSink: Subject<AreaExtra | Root<Schemes> | Area2D<Schemes>> = new Subject<AreaExtra | Root<Schemes> | Area2D<Schemes>>();
    private readonly _editorEventSink: Subject<Root<Schemes>> = new Subject<Root<Schemes>>();

    constructor(editor: NodeEditor<Schemes>, areaPlugin: AreaPlugin<Schemes, AreaExtra>) {
        this._logger.setLevel(log.levels.INFO);

        this._editor = editor;
        this._areaPlugin = areaPlugin;

        this._anchors.add(this.selectionObservable()
            .pipe(tap(() => this.updateSelection()))
            .subscribe());

        this._editor.addPipe(ctx => {
            if (ctx.type === 'nodecreated') {
                this._nodes.add(ctx.data.id);
            }

            if (ctx.type === 'noderemoved') {
                this._nodes.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared') {
                this._nodes.clear()
            }
            return ctx;
        });

        this._editor.addPipe(ctx => {
            if (ctx.type === 'connectioncreated') {
                this._connections.add(ctx.data.id);
            }

            if (ctx.type === 'connectionremoved') {
                this._connections.remove(ctx.data.id)
            }

            if (ctx.type === 'cleared') {
                this._connections.clear()
            }

            return ctx;
        });

        this._editor.addPipe(ctx => {
            this._editorEventSink.next(ctx);
            return ctx;
        });

        this._areaPlugin.addPipe(ctx => {
            this._areaEventSink.next(ctx);
            return ctx;
        });
    }

    public getNodes(): RxObservableCollection<string> {
        return this._nodes;
    }

    public getSelectedNodes(): RxObservableCollection<string> {
        return this._selectedNodes;
    }

    public getConnections(): RxObservableCollection<string> {
        return this._connections;
    }

    public getNodePositionUpdatesRaw(includeTranslated?: boolean): Observable<ReteNodePosition> {
        return new Observable<ReteNodePosition>(observer => {
            const areaSubscription = this._areaEventSink.subscribe(ctx => {
                if (ctx.type === 'nodedragged') {
                    const nodeView = this._areaPlugin.nodeViews.get(ctx.data.id);
                    const position = nodeView.position;
                    this._logger.debug(`node dragged to ${JSON.stringify(position)} ${JSON.stringify(ctx.data)}`);
                    const nodeParams: ReteNodePosition = {
                        id: ctx.data.id,
                        x: nodeView.position.x,
                        y: nodeView.position.y
                    };
                    observer.next(nodeParams);
                } else if (includeTranslated && ctx.type === 'nodetranslated') {
                    const position = ctx.data.position;
                    this._logger.debug(`node moved to ${JSON.stringify(position)} ${JSON.stringify(ctx.data)}`);
                    const nodeParams: ReteNodePosition = {
                        id: ctx.data.id,
                        x: ctx.data.position.x,
                        y: ctx.data.position.y
                    };
                    observer.next(nodeParams);
                }
            });

            return () => {
                this._logger.debug("Unsubscribed!");
                areaSubscription.unsubscribe();
            };
        });
    }
    
    public getNodePositionUpdates(bufferTimeInMs?: number, includeTranslated?: boolean): Observable<ReteNodePosition[]> {
        return new Observable<ReteNodePosition[]>(observer => {
            this._logger.debug("Subscriber detected!");
            const eventSource = this.getNodePositionUpdatesRaw(includeTranslated);

            //Rete generates thousands of events about position updates
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
                    return x;
                }))
                .subscribe(observer);
            return () => {
                this._logger.debug("Unsubscribed!");
                subscription.unsubscribe();
            };
        });
    }

    private selectionObservable(): Observable<any> {
        const editorEvents$ = new Observable(context => {
            this._editor.addPipe(ctx => {
                if (ctx.type === 'nodecreated' ||
                    ctx.type === 'noderemoved' ||
                    ctx.type === 'cleared') {
                    context.next(ctx.type);
                }
                return ctx;
            });
        });

        const areaPluginEvents$ = new Observable(context => {
            this._areaPlugin.addPipe(ctx => {
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
        const currentSelectedNodes = this._editor.getNodes().filter(x => x.selected);
        const currentSelectedNodeIds = new Set(currentSelectedNodes.map(node => node.id.toString()));

        const addedNodes: string[] = [];
        const removedNodes: string[] = [];

        // Remove nodes that are no longer selected
        this._selectedNodes.getItems().forEach(nodeId => {
            if (!currentSelectedNodeIds.has(nodeId)) {
                removedNodes.push(nodeId);
            }
        });

        // Add newly selected nodes
        currentSelectedNodeIds.forEach(nodeId => {
            if (!this._selectedNodes.contains(nodeId)) {
                addedNodes.push(nodeId);
            }
        });

        // Logging changes
        if (addedNodes.length > 0 || removedNodes.length > 0) {
            if (removedNodes.length > 0) {
                //this.logger.debug(`Selection changed, removed nodes: ${removedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this._selectedNodes.removeRange(removedNodes);
            }
            if (addedNodes.length > 0) {
                //this.logger.debug(`Selection changed, added nodes: ${addedNodes.join(', ')}, current selection: ${currentSelectedNodes.map(x => x.id).join(', ')}`);
                this._selectedNodes.addRange(addedNodes);
            }
        }
    }
}