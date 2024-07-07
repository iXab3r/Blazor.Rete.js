using System.Reactive;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using BlazorReteJs.Api;
using BlazorReteJs.Collections;
using BlazorReteJs.Scaffolding;
using BlazorReteJs.Services;
using DynamicData;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Logging;
using Microsoft.JSInterop;

namespace BlazorReteJs;

public partial class BlazorReteEditor<TNode> : IAsyncDisposable, IBlazorReteEditor<TNode>
{
    private ElementReference? editorRef;
    private ReteEditorFacade? reteEditorFacade;
    private IDisposable? storageAnchor;
    
    private readonly Lazy<Task<IJSObjectReference>> reteModuleTask;
    private readonly Lazy<Task<IJSObjectReference>> blazorReteJsInteropTask;
    private readonly Lazy<Task<IJSObjectReference>> observablesJsInteropTask;
    private readonly ISubject<Unit> whenLoaded = new ReplaySubject<Unit>(1);
    private readonly Lazy<ILogger> logSupplier;

    public BlazorReteEditor()
    {
        logSupplier = new Lazy<ILogger>(() => (LoggerFactory ?? throw new InvalidOperationException("Logger factory is not injected")).CreateLogger(GetType()));

        blazorReteJsInteropTask = new Lazy<Task<IJSObjectReference>>(() => GetJSRuntimeOrThrow().ImportModule("./_content/BlazorReteJs/js/BlazorReteJsInterop.js").AsTask());
        observablesJsInteropTask = new Lazy<Task<IJSObjectReference>>(() => GetJSRuntimeOrThrow().ImportModule("./_content/BlazorReteJs/js/ObservablesJsInterop.js").AsTask());
        reteModuleTask = new Lazy<Task<IJSObjectReference>>(() => GetJSRuntimeOrThrow().ImportModule("./_content/BlazorReteJs/js/rete-editor-factory.js").AsTask());
        
        NodePositionUpdates = WhenLoaded
            .SelectMany(async _ =>
            {
                var observableReference = await reteEditorFacade!.GetNodePositionUpdatesObservable(bufferTime: TimeSpan.FromMilliseconds(250), includeTranslated: true);
                var listener = JsObservableListenerFacade<ReteNodePosition[]>.CreateObservable(JsRuntime!, observableReference);
                return listener;
            })
            .Switch();

        WhenTemplateCreated = WhenLoaded
            .Select(_ =>
            {
                return Observable.Create<ReteDockTemplateCreateEventArgs>(async (observer) =>
                {
                    var listener = await ReteDockTemplateListenerFacade.Create(reteEditorFacade!);
                    var subscription = listener.WhenTemplateCreate.Subscribe(observer);
                    
                    // ReSharper disable once AsyncVoidLambda
                    return async () =>
                    {
                        subscription.Dispose();
                        try
                        {
                            await listener.DisposeAsync();
                        }
                        catch (JSException)
                        {
                            //could be already cleared/disposed/refreshed at this point
                        }
                    };
                });
            })
            .Switch()
            .Publish()
            .RefCount();
    }
    
    [Inject] 
    public ILoggerFactory? LoggerFactory { get; init; }

    [Inject] 
    protected IJSRuntime? JsRuntime { get; init; }

    [Inject] 
    internal IBlazorReteEditorStorage? EditorStorage { get; init; }

    [Parameter] 
    public RenderFragment<BlazorReteNode<TNode>>? NodeTemplate { get; set; }

    public IObservable<ReteDockTemplateCreateEventArgs> WhenTemplateCreated { get; }
    
    public IObservable<Unit> WhenLoaded => whenLoaded;

    public JsProperty<bool> BackgroundEnabled => GetFacadeOrThrow().BackgroundEnabled;

    public JsProperty<bool> Readonly => GetFacadeOrThrow().Readonly;

    public IObservable<ReteNodePosition[]> NodePositionUpdates { get; }

    private ReteEditorId Id => ((IBlazorReteEditor)this).Id;

    private ILogger Log => logSupplier.Value;
    
    [Parameter]
    public EventCallback<MouseEventArgs> OnContextMenu { get; set; }

    ReteEditorId IBlazorReteEditor.Id { get; } = new($"BlazorReteEditor-{Guid.NewGuid()}");
    
    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();
        await HandleLoaded();
    }

    private async Task HandleLoaded()
    {


        storageAnchor = GetStorageOrThrow().Add(this);
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);

        if (firstRender)
        {
            if (editorRef == null)
            {
                throw new InvalidOperationException("Editor ref must be set before initialization");
            }
            
            Log.LogDebug($"Initializing new Rete editor in {editorRef}");
            var reteModule = await reteModuleTask.Value;
            var editorReference = await reteModule.InvokeAsync<IJSObjectReference>("renderEditor", editorRef)
                                  ?? throw new ArgumentException("Failed to initialize Rete.js editor");

            reteEditorFacade = new ReteEditorFacade(editorReference);
            await BackgroundEnabled.SetValue(true);
            whenLoaded.OnNext(Unit.Default);
        }
    }

    public async Task<ReteRectangle> GetViewportBounds()
    {
        var bounds = await GetFacadeOrThrow().GetViewportBounds();
        return bounds;
    }

    public async Task<RetePoint> GetMousePositionInViewport()
    {
        var position = await GetFacadeOrThrow().GetMousePositionInViewport();
        return position;
    }

    public async Task<IObservableList<string>> GetNodes()
    {
        var collection = await GetFacadeOrThrow().GetNodesCollection();
        return collection;
    }

    public async Task<IObservableCache<ReteConnection, string>> GetConnectionsCache()
    {
        GetFacadeOrThrow();

        var nodes = await GetConnections();
        return nodes
            .Connect()
            .TransformAsync(async connectionId =>
            {
                try
                {
                    var jsConnection = await GetFacadeOrThrow().GetConnectionById(connectionId).ConfigureAwait(true);
                    return await ReteConnection.FromJsConnection(GetJSRuntimeOrThrow(), jsConnection).ConfigureAwait(true);
                }
                catch (Exception e)
                {
                    Log.LogWarning(e, "Failed to resolve connection by Id {ConnectionId}", connectionId);
                    return null!;
                }
            })
            .Filter(x => x != null!)
            .AddKey(x => x.Id)
            .AsObservableCache();
    }

    public async Task<IObservableList<string>> GetConnections()
    {
        var collection = await GetFacadeOrThrow().GetConnectionsCollection();
        return collection;
    }

    public async Task<IObservableCache<ReteNode, string>> GetNodesCache()
    {
        var nodes = await GetNodes();
        return nodes
            .Connect()
            .TransformAsync(async nodeId =>
            {
                try
                {
                    var jsNode = await GetFacadeOrThrow().GetNodeById(nodeId).ConfigureAwait(true);
                    return ReteNode.FromJsNode(GetJSRuntimeOrThrow(), jsNode, nodeId);
                }
                catch (Exception e)
                {
                    Log.LogWarning(e, "Failed to resolve node by Id {NodeId}", nodeId);
                    return null!;
                }
            })
            .Filter(x => x != null!)
            .AddKey(x => x.Id)
            .AsObservableCache();
    }

    public async Task<IObservableList<string>> GetSelectedNodes()
    {
        return await GetFacadeOrThrow().GetSelectedNodesCollection();
    }

    public async Task SetSelectedNodes(IReadOnlyList<string> nodesIds)
    {
        await GetFacadeOrThrow().SetSelectedNodes(nodesIds.ToArray());
    }

    public async Task ClearSelectedNodes()
    {
        await GetFacadeOrThrow().ClearSelectedNodes();
    }

    public async Task UpdateNodes(params ReteNodeParams[] nodeParams)
    {
        await GetFacadeOrThrow().UpdateNodes(nodeParams);
    }

    public async Task UpdateConnection(ReteConnection connection)
    {
        await GetFacadeOrThrow().UpdateConnection(connection.Id);
    }

    public async Task<bool> RemoveConnection(ReteConnection connection)
    {
        var result = await GetFacadeOrThrow().RemoveConnection(connection.Id);
        return result;
    }
    
    public async Task AddDockTemplate(ReteNodeParams nodeParams)
    {
        await GetFacadeOrThrow().AddDockTemplate(nodeParams);
    }

    public async Task<ReteConnection[]> AddConnections(params ReteConnectionParams[] connectionParams)
    {
        var jsConnections = await GetFacadeOrThrow().AddConnections(connectionParams);

        if (jsConnections.Length != connectionParams.Length)
        {
            throw new InvalidOperationException($"Something is wrong - expected {connectionParams.Length} JS connections, got {jsConnections.Length}");
        }

        return jsConnections.Zip(connectionParams)
            .Select(x => ReteConnection.FromJsConnection(GetJSRuntimeOrThrow(), x.First, x.Second))
            .ToArray();
    }

    public async Task<ReteConnection> AddConnection(ReteConnectionParams connectionParams)
    {
        var jsConnection = await GetFacadeOrThrow().AddConnection(connectionParams);
        var csConnection = ReteConnection.FromJsConnection(GetJSRuntimeOrThrow(), jsConnection, connectionParams);
        return csConnection;
    }

    public Task<ReteConnection> AddConnection(ReteNode source, ReteNode target, string? connectionId = default)
    {
        return AddConnection(new ReteConnectionParams() {Id = connectionId, SourceNodeId = source.Id, TargetNodeId = target.Id});
    }

    public async Task<ReteNode> GetNode(string nodeId)
    {
        var jsNode = await GetFacadeOrThrow().GetNodeById(nodeId);
        return ReteNode.FromJsNode(GetJSRuntimeOrThrow(), jsNode, nodeId);
    }

    public async Task<ReteNode> AddNode(ReteNodeParams nodeParams)
    {
        var jsNode = await GetFacadeOrThrow().AddNode(nodeParams);
        var csNode = 
            string .IsNullOrEmpty(nodeParams.Id) 
                ? await ReteNode.FromJsNode(GetJSRuntimeOrThrow(), jsNode)
                : ReteNode.FromJsNode(GetJSRuntimeOrThrow(), jsNode, nodeParams.Id);
        if (!string.IsNullOrEmpty(nodeParams.Id) && !string.Equals(csNode.Id, nodeParams.Id))
        {
            throw new ArgumentException($"Failed to create node with Id {nodeParams.Id}, result: {csNode}", nameof(nodeParams.Id));
        }

        return csNode;
    }

    public async Task<IReadOnlyList<ReteNode>> AddNodes(params ReteNodeParams[] nodeParams)
    {
        var jsNodes = await GetFacadeOrThrow().AddNodes(nodeParams);

        if (jsNodes.Length != nodeParams.Length)
        {
            throw new InvalidOperationException($"Something is wrong - expected {nodeParams.Length} JS nodes, got {jsNodes.Length}");
        }

        var result = jsNodes.Zip(nodeParams)
            .Select(x => ReteNode.FromJsNode(GetJSRuntimeOrThrow(), x.First, x.Second.Id!))
            .ToArray();
        return result;
    }

    public async Task Clear()
    {
        await GetFacadeOrThrow().Clear();
    }

    public async Task ArrangeNodes()
    {
        await GetFacadeOrThrow().ArrangeNodes();
    }

    public async Task ZoomAtNodes()
    {
        await GetFacadeOrThrow().ZoomAtNodes();
    }

    public async Task<bool> RemoveNode(ReteNode node)
    {
        return await GetFacadeOrThrow().RemoveNode(node.Id);
    }
    
    private async Task HandleContextMenu(MouseEventArgs args)
    {
        if (OnContextMenu.HasDelegate)
        {
            await OnContextMenu.InvokeAsync(args);
        }
    }

    private ReteEditorFacade GetFacadeOrThrow()
    {
        if (reteEditorFacade == null)
        {
            throw new InvalidOperationException("Editor is not ready yet, wait until it is loaded");
        }

        return reteEditorFacade;
    }

    private IJSRuntime GetJSRuntimeOrThrow()
    {
        if (JsRuntime == null)
        {
            throw new InvalidOperationException("JSRuntime is not ready yet, wait until it is loaded");
        }

        return JsRuntime;
    }


    private IBlazorReteEditorStorage GetStorageOrThrow()
    {
        if (EditorStorage == null)
        {
            throw new InvalidOperationException("EditorStorage is not ready yet, wait until it is loaded");
        }

        return EditorStorage;
    }

    public ValueTask DisposeAsync()
    {
        //FIXME Dispose Rete resources
        return ValueTask.CompletedTask;
    }
}