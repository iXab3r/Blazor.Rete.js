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
    private IJSObjectReference reteModule;
    private IJSObjectReference blazorReteJsInterop;
    private IJSObjectReference observablesJsInterop;
    private ReteEditorFacade reteEditorFacade;
    
    private readonly ISubject<Unit> whenLoaded = new ReplaySubject<Unit>(1);

    [Inject] protected IJSRuntime JsRuntime { get; private set; }

    internal ReteEditorFacade JsEditor => reteEditorFacade ?? throw new ArgumentNullException(nameof(reteEditorFacade), $"JavaScript editor is not initialized");

    public IObservable<Unit> WhenLoaded => whenLoaded;

    public JsProperty<ReteArrangeDirection> ArrangeDirection => reteEditorFacade.ArrangeDirection;
    
    public JsProperty<ReteArrangeAlgorithm> ArrangeAlgorithm => reteEditorFacade.ArrangeAlgorithm;
    
    public JsProperty<bool> BackgroundEnabled => reteEditorFacade.BackgroundEnabled;
    
    public JsProperty<bool> Readonly => reteEditorFacade.Readonly;

    public JsProperty<bool> AutoArrange => reteEditorFacade.AutoArrange;
    
    public JsProperty<bool> ArrangeAnimate => reteEditorFacade.ArrangeAnimate;

    public IObservable<ReteNodePosition[]> NodePositionUpdates { get; }

    public BlazorReteEditor()
    {
        NodePositionUpdates = WhenLoaded
            .SelectMany(async _ =>
            {
                var observableReference = await reteEditorFacade!.GetNodePositionUpdatesObservable(bufferTime: TimeSpan.FromMilliseconds(250), includeTranslated: true);
                var listener = JsObservableListenerFacade<ReteNodePosition[]>.CreateObservable(JsRuntime, observableReference);
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
        EnsureLoaded();

        var collection = await reteEditorFacade.GetNodesCollection();
        return collection;
    }

    public async Task<IObservableCache<ReteConnection, string>> GetConnectionsCache()
    {
        EnsureLoaded();

        var nodes = await GetConnections();
        return nodes
            .Connect()
            .TransformAsync(async connectionId =>
            {
                var jsConnection = await reteEditorFacade.GetConnectionById(connectionId);
                return await ReteConnection.FromJsConnection(JsRuntime, jsConnection);
            })
            .AddKey(x => x.Id)
            .AsObservableCache();
    }
    
    public async Task<IObservableList<string>> GetConnections()
    {
        EnsureLoaded();
        var collection = await reteEditorFacade.GetConnectionsCollection();
        return collection;
    }
    
    public async Task<IObservableCache<ReteNode, string>> GetNodesCache()
    {
        EnsureLoaded();
        var nodes = await GetNodes();
        return nodes
            .Connect()
            .TransformAsync(async nodeId =>
            {
                var jsNode = await reteEditorFacade.GetNodeById(nodeId);
                return await ReteNode.FromJsNode(JsRuntime, jsNode);
            })
            .AddKey(x => x.Id)
            .AsObservableCache();
    }

    public async Task<IObservableList<string>> GetSelectedNodes()
    {
        EnsureLoaded();
        return await reteEditorFacade.GetSelectedNodesCollection();
    }
    
    public async Task SetSelectedNodes(IReadOnlyList<string> nodesIds)
    {
        EnsureLoaded();
        await reteEditorFacade.SetSelectedNodes(nodesIds.ToArray());
    }
    
    public async Task ClearSelectedNodes()
    {
        EnsureLoaded();
        await reteEditorFacade.ClearSelectedNodes();
    }

    public async Task UpdateNode(ReteNodeParams nodeParams)
    {
        EnsureLoaded();
        await reteEditorFacade.UpdateNode(nodeParams);
    }
    
    public Task UpdateNode(ReteNode node)
    {
        EnsureLoaded();
        return UpdateNode(new ReteNodeParams(){ Id = node.Id});
    }
    
    public async Task UpdateConnection(ReteConnection connection)
    {
        EnsureLoaded();
        await reteEditorFacade.UpdateConnection(connection.Id);
    }

    public async Task<bool> RemoveConnection(ReteConnection connection)
    {
        EnsureLoaded();
        var result = await reteEditorFacade.RemoveConnection(connection.Id);
        return result;
    }

    public async Task AddDockTemplate(ReteNodeParams nodeParams)
    {
        EnsureLoaded();
        await reteEditorFacade.AddDockTemplate(nodeParams);
    }

    public async Task<ReteConnection> AddConnection(ReteNode source, ReteNode target, string connectionId = default)
    {
        EnsureLoaded();
        var jsConnection = await reteEditorFacade.AddConnection(source.Id, target.Id, connectionId);
        var csConnection = await ReteConnection.FromJsConnection(JsRuntime, jsConnection);
        return csConnection;
    }

    public async Task<ReteNode> GetNode(string nodeId)
    {
        EnsureLoaded();
        var jsNode = await reteEditorFacade.GetNodeById(nodeId);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
        return csNode;
    }
    
    public async Task<ReteNode> AddNode(ReteNodeParams nodeParams)
    {
        EnsureLoaded();
        var jsNode = await reteEditorFacade.AddNode(nodeParams);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
        if (!string.IsNullOrEmpty(nodeParams.Id) && !string.Equals(csNode.Id, nodeParams.Id))
        {
            throw new ArgumentException($"Failed to create node with Id {nodeParams.Id}, result: {csNode}", nameof(nodeParams.Id));
        }
        return csNode;
    }

    public async Task Clear()
    {
        EnsureLoaded();
        await reteEditorFacade.Clear();
    }
    
    public async Task ArrangeNodes()
    {
        EnsureLoaded();
        await reteEditorFacade.ArrangeNodes();
    }
    
    public async Task ZoomAtNodes()
    {
        EnsureLoaded();
        await reteEditorFacade.ZoomAtNodes();
    }

    public async Task<bool> RemoveNode(ReteNode node)
    {
        EnsureLoaded();
        return await reteEditorFacade.RemoveNode(node.Id);
    }

    private void EnsureLoaded()
    {
        if (reteEditorFacade == null)
        {
            throw new InvalidOperationException("Editor is not ready yet, wait until it is loaded");
        }
    }
}