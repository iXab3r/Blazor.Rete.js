using System.Reactive.Subjects;
using BlazorReteJs.Api;
using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs;

internal sealed class ReteEditorFacade
{
    private readonly IJSObjectReference editorRef;
    private readonly DotNetObjectReference<ReteEditorFacade> dotNetObjectReference;
    private readonly ISubject<string[]> whenSelectionChanged = new Subject<string[]>();

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        this.dotNetObjectReference = DotNetObjectReference.Create(this);
        this.editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
        BackgroundEnabled = new JsProperty<bool>(editorRef, nameof(BackgroundEnabled));
        ArrangeDirection = new JsProperty<ReteArrangeDirection>(editorRef, nameof(ArrangeDirection));
        ArrangeAlgorithm = new JsProperty<ReteArrangeAlgorithm>(editorRef, nameof(ArrangeAlgorithm));
        Readonly = new JsProperty<bool>(editorRef, nameof(Readonly));
        AutoArrange = new JsProperty<bool>(editorRef, nameof(AutoArrange));
    }

    public IJSObjectReference EditorRef => editorRef;

    public IObservable<string[]> WhenSelectionChanged => whenSelectionChanged;
    
    public JsProperty<bool> BackgroundEnabled { get; }
    
    public JsProperty<ReteArrangeDirection> ArrangeDirection { get; }
    
    public JsProperty<ReteArrangeAlgorithm> ArrangeAlgorithm { get; }
    
    public JsProperty<bool> Readonly { get; }
    
    public JsProperty<bool> AutoArrange { get; }

    public ValueTask<IJSObjectReference> AddNode(string label, string nodeId = default) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addNode", label, nodeId);
    }
    
    public ValueTask<IJSObjectReference> AddConnection(string firstNodeId, string secondNodeId, string connectionId = default) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addConnection", firstNodeId, secondNodeId, connectionId);
    } 
    
    public ValueTask<bool> RemoveConnection(string connectionId) 
    {
        return editorRef.InvokeAsync<bool>("removeConnection", connectionId);
    }
    
    public ValueTask<bool> RemoveNode(string nodeId) 
    {
        return editorRef.InvokeAsync<bool>("removeNode", nodeId);
    }
    
    public ValueTask UpdateNode(string nodeId) 
    {
        return editorRef.InvokeVoidAsync("updateNode", nodeId);
    }
    
    public ValueTask UpdateConnection(string connectionId) 
    {
        return editorRef.InvokeVoidAsync("updateConnection", connectionId);
    }
    
    public ValueTask UpdateControl(string controlId) 
    {
        return editorRef.InvokeVoidAsync("updateControl", controlId);
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
