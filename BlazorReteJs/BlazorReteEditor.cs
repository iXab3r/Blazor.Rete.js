using System.Reactive;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using BlazorReteJs.Api;
using BlazorReteJs.Collections;
using BlazorReteJs.Scaffolding;
using DynamicData;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorReteJs;

public partial class BlazorReteEditor
{
    private ElementReference editorRef;
    private IJSObjectReference? reteModule;
    private IJSObjectReference? blazorReteJsInterop;
    private IJSObjectReference? observablesJsInterop;
    private ReteEditorFacade? reteEditorFacade;
    
    private readonly ISubject<Unit> whenLoaded = new ReplaySubject<Unit>(1);

    [Inject] protected IJSRuntime JsRuntime { get; private set; }

    public IObservable<Unit> WhenLoaded => whenLoaded;

    public JsProperty<ReteArrangeDirection> ArrangeDirection => GetFacadeOrThrow().ArrangeDirection;
    
    public JsProperty<ReteArrangeAlgorithm> ArrangeAlgorithm => GetFacadeOrThrow().ArrangeAlgorithm;
    
    public JsProperty<bool> BackgroundEnabled => GetFacadeOrThrow().BackgroundEnabled;
    
    public JsProperty<bool> Readonly => GetFacadeOrThrow().Readonly;

    public JsProperty<bool> AutoArrange => GetFacadeOrThrow().AutoArrange;
    
    public JsProperty<bool> ArrangeAnimate => GetFacadeOrThrow().ArrangeAnimate;

    public IObservable<ReteNodePosition[]> NodePositionUpdates { get; }

    public BlazorReteEditor()
    {
        NodePositionUpdates = WhenLoaded
            .SelectMany(async _ =>
            {
                var observableReference = await reteEditorFacade!.GetNodePositionUpdatesObservable(bufferTime: TimeSpan.FromMilliseconds(250), includeTranslated: true);
                var listener = JsObservableListenerFacade<ReteNodePosition[]>.CreateObservable(JsRuntime!, observableReference);
                return listener; 
            })
            .Switch();
    }

    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();
        await HandleLoaded();
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);
    }

    private async Task HandleLoaded()
    {
        blazorReteJsInterop = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/BlazorReteJsInterop.js"))
                      ?? throw new FileLoadException("Failed to load BlazorReteJsInterop JS module");
        observablesJsInterop = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/ObservablesJsInterop.js"))
                               ?? throw new FileLoadException("Failed to load ObservablesJsInterop JS module");
        reteModule = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/rete-editor-factory.js"))
                     ?? throw new FileLoadException("Failed to load Rete JS module");
        var editorReference = await reteModule!.InvokeAsync<IJSObjectReference>("renderEditor", editorRef)
                              ?? throw new ArgumentException("Failed to initialize Rete.js editor");
        reteEditorFacade = new ReteEditorFacade(editorReference);
        await BackgroundEnabled.SetValue(true);
        whenLoaded.OnNext(Unit.Default);
    }
    
    public async Task<IObservableList<string>> GetNodes()
    {
        GetFacadeOrThrow();

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
                var jsConnection = await GetFacadeOrThrow().GetConnectionById(connectionId);
                return await ReteConnection.FromJsConnection(JsRuntime, jsConnection);
            })
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
                var jsNode = await GetFacadeOrThrow().GetNodeById(nodeId);
                return await ReteNode.FromJsNode(JsRuntime, jsNode);
            })
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
    
    public Task UpdateNode(ReteNode node)
    {
        GetFacadeOrThrow();
        return UpdateNodes(new ReteNodeParams(){ Id = node.Id});
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
            .Select(x => ReteConnection.FromJsConnection(JsRuntime, x.First, x.Second))
            .ToArray();
    }
    
    public async Task<ReteConnection> AddConnection(ReteConnectionParams connectionParams)
    {
        var jsConnection = await GetFacadeOrThrow().AddConnection(connectionParams);
        var csConnection = ReteConnection.FromJsConnection(JsRuntime, jsConnection, connectionParams);
        return csConnection;
    }
    
    public Task<ReteConnection> AddConnection(ReteNode source, ReteNode target, string? connectionId = default)
    {
        return AddConnection(new ReteConnectionParams() {Id = connectionId, SourceNodeId = source.Id, TargetNodeId = target.Id});
    }

    public async Task<ReteNode> GetNode(string nodeId)
    {
        var jsNode = await GetFacadeOrThrow().GetNodeById(nodeId);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
        return csNode;
    }
    
    public async Task<ReteNode> AddNode(ReteNodeParams nodeParams)
    {
        var jsNode = await GetFacadeOrThrow().AddNode(nodeParams);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
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
            .Select(x => ReteNode.FromJsNode(JsRuntime, x.First, x.Second.Id!))
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

    private ReteEditorFacade GetFacadeOrThrow()
    {
        if (reteEditorFacade == null)
        {
            throw new InvalidOperationException("Editor is not ready yet, wait until it is loaded");
        }

        return reteEditorFacade;
    }
}