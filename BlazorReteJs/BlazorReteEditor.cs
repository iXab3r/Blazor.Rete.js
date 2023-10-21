using System.Reactive;
using System.Reactive.Subjects;
using BlazorReteJs.Api;
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
        var collection = await reteEditorFacade.GetNodesCollection();
        return collection;
    }

    public async Task<IObservableCache<ReteConnection, string>> GetConnectionsCache()
    {
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
        var collection = await reteEditorFacade.GetConnectionsCollection();
        return collection;
    }
    
    public async Task<IObservableCache<ReteNode, string>> GetNodesCache()
    {
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
        return await reteEditorFacade.GetSelectedNodesCollection();
    }

    public async Task UpdateNode(ReteNodeParams nodeParams)
    {
        await reteEditorFacade.UpdateNode(nodeParams);
    }
    
    public Task UpdateNode(ReteNode node)
    {
        return UpdateNode(new ReteNodeParams(){ Id = node.Id});
    }
    
    public async Task UpdateConnection(ReteConnection connection)
    {
        await reteEditorFacade.UpdateConnection(connection.Id);
    }

    public async Task<bool> RemoveConnection(ReteConnection connection)
    {
        var result = await reteEditorFacade.RemoveConnection(connection.Id);
        return result;
    }

    public async Task AddDockTemplate(ReteNodeParams nodeParams)
    {
        await reteEditorFacade.AddDockTemplate(nodeParams);
    }

    public async Task<ReteConnection> AddConnection(ReteNode source, ReteNode target, string connectionId = default)
    {
        var jsConnection = await reteEditorFacade.AddConnection(source.Id, target.Id, connectionId);
        var csConnection = await ReteConnection.FromJsConnection(JsRuntime, jsConnection);
        return csConnection;
    }

    public async Task<ReteNode> GetNode(string nodeId)
    {
        var jsNode = await reteEditorFacade.GetNodeById(nodeId);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
        return csNode;
    }
    
    public async Task<ReteNode> AddNode(ReteNodeParams nodeParams)
    {
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
        await reteEditorFacade.Clear();
    }
    
    public async Task ArrangeNodes(bool animate = false)
    {
        await reteEditorFacade.ArrangeNodes(animate);
    }
    
    public async Task ZoomAtNodes()
    {
        await reteEditorFacade.ZoomAtNodes();
    }

    public async Task<bool> RemoveNode(ReteNode node)
    {
        return await reteEditorFacade.RemoveNode(node.Id);
    }
}