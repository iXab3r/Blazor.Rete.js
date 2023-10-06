using Microsoft.JSInterop;

namespace Blazor.Rete.js;

public interface IReteEditorFacade : IDisposable
{
    ValueTask AddNode(string label);
    ValueTask Setup();
}

public sealed class ReteEditorFacade : IReteEditorFacade
{
    private readonly IJSObjectReference editorRef;

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        this.editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
    }

    public ValueTask AddNode(string label) 
    {
        return editorRef.InvokeVoidAsync("addNode", label);
    }

    public ValueTask Setup()
    {
        return editorRef.InvokeVoidAsync("setup");
    }

    public void Dispose()
    {
        editorRef.DisposeAsync();
    }
}
