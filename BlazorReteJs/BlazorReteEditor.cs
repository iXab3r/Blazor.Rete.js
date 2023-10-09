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
    private readonly List<ReteConnection> connections = new();
    private readonly ISubject<Unit> whenLoaded = new ReplaySubject<Unit>(1);

    [Inject] protected IJSRuntime JsRuntime { get; private set; }

    internal ReteEditorFacade JsEditor => reteEditorFacade ?? throw new ArgumentNullException(nameof(reteEditorFacade), $"JavaScript editor is not initialized");

    public IObservable<Unit> WhenLoaded => whenLoaded;


    protected override void OnInitialized()
    {
        base.OnInitialized();
    }

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
                    var isSelected = set.Contains(node.Id.Value);
                    node.IsSelected.ReportValue(isSelected);
                }
            });
    }
    
    public ValueTask UpdateNode(ReteNode node)
    {
        return reteEditorFacade.UpdateNode(node.Id.Value);
    }

    public async Task<ReteConnection> AddConnection(ReteNode firstNode, ReteNode secondNode)
    {
        var firstNodeId = await firstNode.Id.GetValue();
        var secondNodeId = await secondNode.Id.GetValue();
        var jsConnection = await reteEditorFacade.AddConnection(firstNodeId, secondNodeId);
        var csConnection = new ReteConnection(JsRuntime, jsConnection);
        connections.Add(csConnection);
        return csConnection;
    }

    public async Task<ReteNode> AddNode(string label)
    {
        var jsNode = await reteEditorFacade.AddNode(label);
        var csNode = new ReteNode(JsRuntime, jsNode);
        var nodeId = await csNode.Id.GetValue();
        nodesById.Add(nodeId, csNode);
        return csNode;
    }

    public async Task Clear()
    {
        await reteEditorFacade.Clear();
        connections.Clear();
        nodesById.Clear();
    }

    public async Task RemoveNode(ReteNode node)
    {
        var nodeId = await node.Id.GetValue();
        await reteEditorFacade.RemoveNode(nodeId);
        nodesById.Remove(nodeId);
    }

    public async Task ToggleActive()
    {
        foreach (var reteNode in nodesById.Values)
        {
            var isActive = await reteNode.IsActive.GetValue();
            await reteNode.IsActive.SetValue(!isActive);
            var nodeId = await reteNode.Id.GetValue();
            await reteEditorFacade.UpdateNode(nodeId);
        }
    }
}