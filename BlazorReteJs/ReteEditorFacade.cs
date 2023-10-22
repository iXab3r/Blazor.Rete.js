using BlazorReteJs.Api;
using BlazorReteJs.Collections;
using BlazorReteJs.Scaffolding;
using DynamicData;
using Microsoft.JSInterop;

namespace BlazorReteJs;

internal sealed class ReteEditorFacade
{
    private readonly IJSObjectReference editorRef;

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
        BackgroundEnabled = new JsProperty<bool>(editorRef, nameof(BackgroundEnabled));
        ArrangeDirection = new JsProperty<ReteArrangeDirection>(editorRef, nameof(ArrangeDirection));
        ArrangeAlgorithm = new JsProperty<ReteArrangeAlgorithm>(editorRef, nameof(ArrangeAlgorithm));
        Readonly = new JsProperty<bool>(editorRef, nameof(Readonly));
        ArrangeAnimate = new JsProperty<bool>(editorRef, nameof(ArrangeAnimate));
        AutoArrange = new JsProperty<bool>(editorRef, nameof(AutoArrange));
    }
    
    public IJSObjectReference EditorRef => editorRef;

    public JsProperty<bool> BackgroundEnabled { get; }
    
    public JsProperty<ReteArrangeDirection> ArrangeDirection { get; }
    
    public JsProperty<ReteArrangeAlgorithm> ArrangeAlgorithm { get; }
    
    public JsProperty<bool> AutoArrange { get; }
    
    public JsProperty<bool> ArrangeAnimate { get; }
    
    public JsProperty<bool> Readonly { get; }

    public ValueTask AddDockTemplate(ReteNodeParams nodeParams)
    {
        return editorRef.InvokeVoidAsync("addDockTemplate", nodeParams);
    }
    
    public ValueTask<IJSObjectReference> AddNode(ReteNodeParams nodeParams) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addNode", nodeParams);
    }
    
    public ValueTask<IJSObjectReference> AddConnection(string sourceNodeId, string targetNodeId, string connectionId = default) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addConnection", sourceNodeId, targetNodeId, connectionId);
    } 
    
    public ValueTask<bool> RemoveConnection(string connectionId) 
    {
        return editorRef.InvokeAsync<bool>("removeConnection", connectionId);
    }
    
    public ValueTask<bool> RemoveNode(string nodeId) 
    {
        return editorRef.InvokeAsync<bool>("removeNode", nodeId);
    }  
    
    public ValueTask<IJSObjectReference> GetNodeById(string nodeId) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("getNodeById", nodeId);
    } 
    
    public ValueTask<IJSObjectReference> GetConnectionById(string connectionId) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("getConnectionById", connectionId);
    } 
    
    public ValueTask RemoveSelectedNodes() 
    {
        return editorRef.InvokeVoidAsync("removeSelectedNodes");
    }
    
    public ValueTask UpdateNode(ReteNodeParams nodeParams) 
    {
        return editorRef.InvokeVoidAsync("updateNode", nodeParams);
    }
    
    public ValueTask UpdateConnection(string connectionId) 
    {
        return editorRef.InvokeVoidAsync("updateConnection", connectionId);
    }
    
    public ValueTask UpdateControl(string controlId) 
    {
        return editorRef.InvokeVoidAsync("updateControl", controlId);
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
    
    public ValueTask ArrangeNodes()
    {
        return editorRef.InvokeVoidAsync("arrangeNodes");
    }
    
    public ValueTask ZoomAtNodes()
    {
        return editorRef.InvokeVoidAsync("zoomAtNodes");
    } 
    
    public async ValueTask<IObservableList<string>> GetNodesCollection()
    {
        var collection = await editorRef.InvokeAsync<IJSObjectReference>("getNodesCollection");
        return new RxObservableCollectionFacade<string>(collection);
    }
    
    public async ValueTask<IObservableList<string>> GetConnectionsCollection()
    {
        var collection = await editorRef.InvokeAsync<IJSObjectReference>("getConnectionsCollection");
        return new RxObservableCollectionFacade<string>(collection);
    }
    
    public async ValueTask<IObservableList<string>> GetSelectedNodesCollection()
    {
        var collection = await editorRef.InvokeAsync<IJSObjectReference>("getSelectedNodesCollection");
        return new RxObservableCollectionFacade<string>(collection);
    }

    public void Dispose()
    {
        editorRef.DisposeAsync();
    }
}