using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Microsoft.JSInterop;

namespace BlazorReteJs.Collections;

public sealed class ObservableListenerFacade<T> : IObservable<T>
{
    private readonly IJSObjectReference observableReference;
    private readonly DotNetObjectReference<ObservableListenerFacade<T>> dotNetObjectReference;
    private readonly ISubject<T> sink = new Subject<T>();

    public ObservableListenerFacade(IJSObjectReference observableReference)
    {
        dotNetObjectReference = DotNetObjectReference.Create(this);
        this.observableReference = observableReference;
    }
    
    public static IObservable<T> Create(IJSObjectReference objectReference, string identifier)
    {
        return Observable.Create<T>(async observer =>
        {
            var anchors = new CompositeDisposable();
            var result = new ObservableListenerFacade<T>(objectReference);
            anchors.Add(result.Subscribe(observer));
            var listener = await objectReference.InvokeAsync<IJSObjectReference>(identifier, result.dotNetObjectReference);
            anchors.Add(Disposable.Create(() =>
            {
                //result.collectionReference.InvokeVoidAsync("removeDotnetListener", result.dotNetObjectReference).AsTask().Start();
            }));
            return anchors;
        });
    }

    public static IObservable<T> Create(IJSRuntime jsRuntime, IJSObjectReference observableReference)
    {
        return Observable.Create<T>(async observer =>
        {
            var anchors = new CompositeDisposable();
            var result = new ObservableListenerFacade<T>(observableReference);
            anchors.Add(result.Subscribe(observer));
            var listener = await jsRuntime.InvokeAsync<IJSObjectReference>("ObservablesJsInterop.createObservableListener", observableReference, result.dotNetObjectReference);
            anchors.Add(Disposable.Create(() =>
            {
                //result.collectionReference.InvokeVoidAsync("removeDotnetListener", result.dotNetObjectReference).AsTask().Start();
            }));
            return anchors;
        });
    }
    
    public IDisposable Subscribe(IObserver<T> observer)
    {
        return sink.Subscribe(observer);
    }
     
    [JSInvokable]
    public void OnNext(T value)
    {
        sink.OnNext(value);
    }
    
    [JSInvokable]
    public void OnError(object error)
    {
        sink.OnError(new Exception($"Error: {error}"));
    }
    
    [JSInvokable]
    public void OnCompleted()
    {
        sink.OnCompleted();
    }
}