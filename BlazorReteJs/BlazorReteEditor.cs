using BlazorReteJs.Nodes;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorReteJs;

public partial class BlazorReteEditor
{
    private ElementReference editorAreaRef;
    private IJSObjectReference? reteModule;
    private ReteEditorFacade? reteEditorFacade;

    private readonly Dictionary<string, ReteNode> nodes = new();
    
    [Inject]
    protected IJSRuntime JsRuntime { get; private set; }

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        await base.OnAfterRenderAsync(firstRender);

        if (firstRender)
        {
            await HandleLoaded();
        }
    }

    private async Task HandleLoaded()
    {
        reteModule = (await JsRuntime.InvokeAsync<IJSObjectReference>("import", "./_content/BlazorReteJs/js/reteInterop.js"))
                     ?? throw new FileLoadException("Failed to load Rete JS module");
        var editorReference = await reteModule!.InvokeAsync<IJSObjectReference>("renderEditor", editorAreaRef)
                              ?? throw new ArgumentException("Failed to initialize Rete.js editor");
        reteEditorFacade = new ReteEditorFacade(editorReference);
        await reteEditorFacade.Setup();
    }

    public async Task<ReteNode> AddNode(string label)
    {
        var jsNode = await reteEditorFacade!.AddNode(label);
        var csNode = new ReteNode(jsNode);
        return csNode;
    }
}