using Microsoft.JSInterop;

namespace Blazor.Rete.js;

public interface IReteEditorFacade : IDisposable
{
    ValueTask AddNode(string label);
    ValueTask Setup();
}

public sealed class ReteEditorFacade
{
    private readonly IJSObjectReference editorRef;

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        this.editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
    }

    public IJSObjectReference EditorRef => editorRef;

    public ValueTask<IJSObjectReference> AddNode(string label) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addNode", label);
    }

    public ValueTask Setup()
    {
        return editorRef.InvokeVoidAsync("setup");
    }
    
    public ValueTask OrderNodes()
    {
        return editorRef.InvokeVoidAsync("orderNodes");
    } 
    
    public ValueTask ArrangeNodes(bool animate)
    {
        return editorRef.InvokeVoidAsync("arrangeNodes", animate);
    }
    
    public ValueTask ZoomAtNodes()
    {
        return editorRef.InvokeVoidAsync("zoomAtNodes");
    }

    public void Dispose()
    {
        editorRef.DisposeAsync();
    }
}
