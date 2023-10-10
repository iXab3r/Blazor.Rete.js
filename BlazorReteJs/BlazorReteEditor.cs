using System.Reactive;
using System.Reactive.Subjects;
using BlazorReteJs.Nodes;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorReteJs;

public partial class BlazorReteEditor
{
    private ElementReference editorRef;
    private IJSObjectReference reteModule;
    private IJSObjectReference utilsModule;
    private ReteEditorFacade reteEditorFacade;

    private readonly Dictionary<string, ReteNode> nodesById = new();
    private readonly Dictionary<string, ReteConnection> connectionsById = new();
    private readonly ISubject<Unit> whenLoaded = new ReplaySubject<Unit>(1);

    [Inject] protected IJSRuntime JsRuntime { get; private set; }

    internal ReteEditorFacade JsEditor => reteEditorFacade ?? throw new ArgumentNullException(nameof(reteEditorFacade), $"JavaScript editor is not initialized");

    public IObservable<Unit> WhenLoaded => whenLoaded;

    public IEnumerable<ReteNode> Nodes => nodesById.Values;
    
    public IEnumerable<ReteConnection> Connections => connectionsById.Values;

    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();
        await HandleLoaded();
        whenLoaded.OnNext(Unit.Default);
    }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);
    }

    private async Task HandleLoaded()
    {
        utilsModule = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/BlazorReteJsInterop.js"))
                      ?? throw new FileLoadException("Failed to load Utils JS module");
        reteModule = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/reteInterop.js"))
                     ?? throw new FileLoadException("Failed to load Rete JS module");
        var editorReference = await reteModule!.InvokeAsync<IJSObjectReference>("renderEditor", editorRef)
                              ?? throw new ArgumentException("Failed to initialize Rete.js editor");
        reteEditorFacade = new ReteEditorFacade(editorReference);
        await reteEditorFacade.Initialize();

        reteEditorFacade.WhenSelectionChanged
            .Subscribe(x =>
            {
                var set = new HashSet<string>(x);
                foreach (var node in nodesById.Values)
                {
                    var isSelected = set.Contains(node.Id);
                    node.IsSelected.ReportValue(isSelected);
                }
            });
    }
    
    public ValueTask UpdateNode(ReteNode node)
    {
        return reteEditorFacade.UpdateNode(node.Id);
    }
    
    public ValueTask EnableReadonly()
    {
        return reteEditorFacade.EnableReadonly();
    }
    
    public ValueTask DisableReadonly() 
    {
        return reteEditorFacade.DisableReadonly();
    }

    public async Task<bool> RemoveConnection(string connectionId)
    {
        if (!connectionsById.Remove(connectionId))
        {
            return false;
        }
        var result = await reteEditorFacade.RemoveConnection(connectionId);
        return result;
    }

    public async Task<ReteConnection> AddConnection(ReteNode source, ReteNode target, string connectionId = default)
    {
        var jsConnection = await reteEditorFacade.AddConnection(source.Id, target.Id, connectionId);
        var csConnection = await ReteConnection.FromJsConnection(JsRuntime, jsConnection);
        connectionsById.Add(csConnection.Id, csConnection);
        return csConnection;
    }

    public async Task<ReteNode> AddNode(string label, string nodeId = default)
    {
        var jsNode = await reteEditorFacade.AddNode(label, nodeId);
        var csNode = await ReteNode.FromJsNode(JsRuntime, jsNode);
        if (!string.IsNullOrEmpty(nodeId) && !string.Equals(csNode.Id, nodeId))
        {
            throw new ArgumentException($"Failed to create node with Id {nodeId}, result: {csNode}", nameof(nodeId));
        }
        nodesById.Add(csNode.Id, csNode);
        return csNode;
    }

    public async Task Clear()
    {
        await reteEditorFacade.Clear();
        connectionsById.Clear();
        nodesById.Clear();
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
        nodesById.Remove(node.Id);
        return await reteEditorFacade.RemoveNode(node.Id);
    }

    public async Task ToggleActive()
    {
        foreach (var reteNode in nodesById.Values)
        {
            var isActive = await reteNode.IsActive.GetValue();
            await reteNode.IsActive.SetValue(!isActive);
            await reteEditorFacade.UpdateNode(reteNode.Id);
        }
    }
}