using System.Reactive;
using System.Reactive.Concurrency;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Runtime.CompilerServices;
using Microsoft.JSInterop;

namespace BlazorReteJs.Collections;

public sealed class JsObservableListenerFacade<T>
{
    private static IObservable<T> CreateObservable(Func<JsObservableConsumer<T>, ValueTask<IJSObjectReference>> dotnetListenerFactory)
    {
        return Observable.Create<T>(async observer =>
        {
            var consumer = new JsObservableConsumer<T>(); //IObservable<T>
            var jsSubscription = await dotnetListenerFactory(consumer);
            var subscription = consumer.Sink.Subscribe(observer);
            
            // ReSharper disable once AsyncVoidLambda
            return async () =>
            {
                consumer.Dispose();
                subscription.Dispose();
                await jsSubscription.InvokeVoidAsync("dispose");
            };
        });
    }

    public static IObservable<T> CreateObservable(
        IJSRuntime jsRuntime, 
        IJSObjectReference observableReference)
    {
        return CreateObservable(consumer => jsRuntime.InvokeAsync<IJSObjectReference>("ObservablesJsInterop.createObservableListener", observableReference, consumer.DotnetObjectReference));
    }
    
    public static IObservable<T> CreateObservableUsingFactoryMethod(
        IJSObjectReference objectReference,
        string identifier)
    {
        return CreateObservable(consumer => objectReference.InvokeAsync<IJSObjectReference>(identifier, consumer.DotnetObjectReference));
    }

    public static async IAsyncEnumerable<T> CreateAsyncEnumerable(
        IJSRuntime jsRuntime, 
        IJSObjectReference observableReference,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var consumer = new JsObservableConsumer<T>(); //IObservable<T>
        var stopSignal = new Subject<Unit>();
        await using var cancellationTokenRegistration = cancellationToken.Register(() => stopSignal.OnNext(Unit.Default));

        var jsSubscription = await jsRuntime.InvokeAsync<IJSObjectReference>("ObservablesJsInterop.createObservableListener", cancellationToken, observableReference, consumer.DotnetObjectReference);
        foreach (var item in consumer.Sink.TakeUntil(stopSignal))
        {
            yield return item;
        }
        // ReSharper disable once MethodSupportsCancellation at this point we're already cancelled
        await jsSubscription.InvokeVoidAsync("dispose");
    }
}