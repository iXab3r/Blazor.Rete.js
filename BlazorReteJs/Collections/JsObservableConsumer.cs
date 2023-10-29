using System.Reactive.Subjects;
using Microsoft.JSInterop;

namespace BlazorReteJs.Collections;

internal sealed class JsObservableConsumer<T> : IDisposable
{
    private readonly Subject<T> sink = new();

    public JsObservableConsumer()
    {
        DotnetObjectReference = DotNetObjectReference.Create(this);
    }
    
    public IObservable<T> Sink => sink;

    public DotNetObjectReference<JsObservableConsumer<T>> DotnetObjectReference { get; }

    [JSInvokable]
    public void OnNext(T value)
    {
        sink.OnNext(value);
    }

    [JSInvokable]
    public void OnError(object error)
    {
        sink.OnError(new Exception($"JS Observable Error: {error}")
        {
            Data =
            {
                {"JS error", error}
            }
        });
    }

    [JSInvokable]
    public void OnCompleted()
    {
        sink.OnCompleted();
    }

    public void Dispose()
    {
        DotnetObjectReference?.Dispose();
    }
}