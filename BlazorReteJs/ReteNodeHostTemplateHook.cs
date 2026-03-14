using BlazorReteJs.Api;
using Microsoft.JSInterop;

namespace BlazorReteJs;

internal sealed class ReteNodeHostTemplateHook<TNode> : IReteDockTemplateHook, IAsyncDisposable
{
    private readonly Func<ReteNodeParams, ReteNodeParams> hostFactory;
    private readonly ReteEditorFacade editorFacade;
    private readonly DotNetObjectReference<ReteNodeHostTemplateHook<TNode>> hookRef;

    private ReteNodeHostTemplateHook(ReteEditorFacade editorFacade, Func<ReteNodeParams, ReteNodeParams> hostFactory)
    {
        this.editorFacade = editorFacade;
        this.hostFactory = hostFactory;
        hookRef = DotNetObjectReference.Create(this);
    }

    public static async ValueTask<ReteNodeHostTemplateHook<TNode>> Create(
        ReteEditorFacade editorFacade,
        Func<ReteNodeParams, ReteNodeParams> hostFactory)
    {
        var hook = new ReteNodeHostTemplateHook<TNode>(editorFacade, hostFactory);
        await editorFacade.AddDockTemplateHook(hook.hookRef);
        return hook;
    }

    [JSInvokable]
    public ReteNodeParams HandleTemplateCreate(ReteNodeParams nodeParams)
    {
        return hostFactory(nodeParams);
    }

    public async ValueTask DisposeAsync()
    {
        await editorFacade.RemoveDockTemplateHook(hookRef);
        hookRef.Dispose();
    }
}
