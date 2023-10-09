using System.Reactive.Subjects;
using Microsoft.JSInterop;

namespace BlazorReteJs;

public sealed class ReteEditorFacade
{
    private readonly IJSObjectReference editorRef;
    private readonly DotNetObjectReference<ReteEditorFacade> dotNetObjectReference;
    private readonly ISubject<string[]> whenSelectionChanged = new Subject<string[]>();

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        this.dotNetObjectReference = DotNetObjectReference.Create(this);
        this.editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
    }

    public IJSObjectReference EditorRef => editorRef;

    public IObservable<string[]> WhenSelectionChanged => whenSelectionChanged;

    public ValueTask<IJSObjectReference> AddNode(string label) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addNode", label);
    }
    
    public ValueTask<IJSObjectReference> AddConnection(string firstNodeId, string secondNodeId) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addConnection", firstNodeId, secondNodeId);
    }
    
    public ValueTask RemoveNode(string nodeId) 
    {
        return editorRef.InvokeVoidAsync("removeNode", nodeId);
    }
    
    public ValueTask UpdateNode(string nodeId) 
    {
        return editorRef.InvokeVoidAsync("updateNode", nodeId);
    }

    public ValueTask Initialize()
    {
        return editorRef.InvokeVoidAsync("setDotnetEventsHandler", dotNetObjectReference);
    }
    
    public ValueTask Clear() 
    {
        return editorRef.InvokeVoidAsync("clear");
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

    [JSInvokable]
    public void OnSelectionChanged(string[] nodeIds)
    {
        whenSelectionChanged.OnNext(nodeIds);
    }

    public void Dispose()
    {
        editorRef.DisposeAsync();
    }
}
