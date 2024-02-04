using System.Reactive.Subjects;
using BlazorReteJs.Api;
using Microsoft.JSInterop;

namespace BlazorReteJs;

internal class ReteDockTemplateListenerFacade : IReteDockTemplateHook, IAsyncDisposable
{
    private readonly ReteEditorFacade editorFacade;
    private readonly DotNetObjectReference<ReteDockTemplateListenerFacade> facadeRef;
    private readonly Subject<ReteDockTemplateCreateEventArgs> whenTemplateCreate = new();

    private ReteDockTemplateListenerFacade(ReteEditorFacade editorFacade)
    {
        this.editorFacade = editorFacade;
        facadeRef = DotNetObjectReference.Create(this);
    }

    public IObservable<ReteDockTemplateCreateEventArgs> WhenTemplateCreate => whenTemplateCreate;

    public static async ValueTask<ReteDockTemplateListenerFacade> Create(ReteEditorFacade editorFacade)
    {
        var listener = new ReteDockTemplateListenerFacade(editorFacade);
        await editorFacade.AddDockTemplateHook(listener.facadeRef);
        return listener;
    }

    public async ValueTask DisposeAsync()
    {
        await editorFacade.RemoveDockTemplateHook(facadeRef);
        facadeRef.Dispose();
    }

    [JSInvokable]
    public ReteNodeParams HandleTemplateCreate(ReteNodeParams nodeParams)
    {
        var args = new ReteDockTemplateCreateEventArgs
        {
            NodeParams = nodeParams
        };
        whenTemplateCreate.OnNext(args);
        return args.NodeParams;
    }
}