using BlazorReteJs.Api;
using BlazorReteJs.Collections;
using BlazorReteJs.Scaffolding;
using DynamicData;
using Microsoft.JSInterop;

namespace BlazorReteJs;

internal sealed class ReteEditorFacade
{
    private readonly IJSObjectReference editorRef;

    private Func<ReteNodeParams, Task<ReteNodeParams>>? paramsFactory;

    public ReteEditorFacade(IJSObjectReference jsModule)
    {
        editorRef = jsModule ?? throw new ArgumentNullException(nameof(jsModule));
        BackgroundEnabled = new JsProperty<bool>(editorRef, nameof(BackgroundEnabled));
        Readonly = new JsProperty<bool>(editorRef, nameof(Readonly));
    }
    
    public IJSObjectReference EditorRef => editorRef;

    public JsProperty<bool> BackgroundEnabled { get; }
    
    public JsProperty<bool> Readonly { get; }
    
    public ValueTask AddDockTemplate(ReteNodeParams nodeParams)
    {
        return editorRef.InvokeVoidAsync("addDockTemplate", nodeParams);
    }

    public async ValueTask AddDockTemplateHook<T>(DotNetObjectReference<T> hookRef) where T : class, IReteDockTemplateHook
    {
        await editorRef.InvokeVoidAsync("addDockTemplateHookDotNet", hookRef);
    }
    
    public async ValueTask RemoveDockTemplateHook<T>(DotNetObjectReference<T> hookRef) where T : class, IReteDockTemplateHook
    {
        await editorRef.InvokeVoidAsync("removeDockTemplateHookDotNet", hookRef);
    }
    
    public ValueTask<IJSObjectReference> AddNode(ReteNodeParams nodeParams) 
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addNode", nodeParams);
    }
    
    public ValueTask<IJSObjectReference[]> AddNodes(params ReteNodeParams[] nodeParams) 
    {
        return editorRef.InvokeAsync<IJSObjectReference[]>("addNodesDotNet", nodeParams);
    }

    public ValueTask<IJSObjectReference[]> AddConnections(params ReteConnectionParams[] connectionParams)
    {
        return editorRef.InvokeAsync<IJSObjectReference[]>("addConnectionsDotNet", connectionParams);
    }
    
    public ValueTask<IJSObjectReference> AddConnection(ReteConnectionParams connectionParams)
    {
        return editorRef.InvokeAsync<IJSObjectReference>("addConnection", connectionParams);
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
    
    public ValueTask<ReteRectangle> GetViewportBounds() 
    {
        return editorRef.InvokeAsync<ReteRectangle>("getViewportBounds");
    }
    
    public ValueTask<RetePoint> GetMousePositionInViewport() 
    {
        return editorRef.InvokeAsync<RetePoint>("getMousePositionInViewport");
    } 
    
    public ValueTask RemoveSelectedNodes() 
    {
        return editorRef.InvokeVoidAsync("removeSelectedNodes");
    }
    
    public ValueTask UpdateNode(ReteNodeParams nodeParams)
    {
        return editorRef.InvokeVoidAsync("updateNode", nodeParams);
    }
    
    public ValueTask UpdateNodes(params ReteNodeParams[] nodeParams)
    {
        return nodeParams.Length == 1 ? UpdateNode(nodeParams[0]) : editorRef.InvokeVoidAsync("updateNodes", nodeParams);
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
    
    public ValueTask ArrangeNodes()
    {
        return editorRef.InvokeVoidAsync("arrangeNodes");
    }
    
    public ValueTask ZoomAtNodes()
    {
        return editorRef.InvokeVoidAsync("zoomAtNodes");
    }
    
    public async ValueTask SetSelectedNodes(IReadOnlyList<string> nodeIds)
    {
        await editorRef.InvokeVoidAsync("setSelectedNodes", nodeIds);
    } 
    
    public async ValueTask ClearSelectedNodes()
    {
        await editorRef.InvokeVoidAsync("clearSelectedNodes");
    } 

    public async ValueTask<IJSObjectReference> GetNodePositionUpdatesObservable(TimeSpan? bufferTime = default, bool? includeTranslated = default)
    {
        var observableReference = await editorRef.InvokeAsync<IJSObjectReference>("getNodePositionUpdatesObservable", bufferTime?.TotalMilliseconds, includeTranslated);
        return observableReference;
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
    
    [JSInvokable]
    public async ValueTask<ReteNodeParams> MutateTemplateParams(ReteNodeParams initialParams)
    {
        if (paramsFactory == null)
        {
            return initialParams;
        }

        var finalParams = await paramsFactory(initialParams);
        return finalParams;
    }
    
    public void Dispose()
    {
        editorRef.DisposeAsync();
    }
}