using System.Reactive.Disposables;
using System.Reactive.Linq;
using DynamicData;
using Microsoft.JSInterop;

namespace BlazorReteJs.Collections;

public sealed class RxObservableCollectionFacade<T> : IObservableList<T>
{
    private readonly IJSObjectReference collectionReference;
    private readonly CompositeDisposable anchors = new();
    private readonly IObservableList<T> itemsSource;

    public RxObservableCollectionFacade(IJSObjectReference collectionReference)
    {
        this.collectionReference = collectionReference;
        var listener = JsObservableListenerFacade<JsChange<T>>.CreateObservableUsingFactoryMethod(collectionReference, "listenDotnet");
        itemsSource = listener
            .Select(x => x.ToChange())
            .Select(x => new ChangeSet<T>(new[] {x}))
            .AsObservableList();
        anchors.Add(itemsSource);
    }
    
    public void Dispose()
    {
        anchors.Dispose();
    }

    public IObservable<IChangeSet<T>> Connect(Func<T, bool> predicate = null)
    {
        return itemsSource.Connect(predicate);
    }

    public IObservable<IChangeSet<T>> Preview(Func<T, bool> predicate = null)
    {
        return itemsSource.Preview(predicate);
    }

    public int Count => itemsSource.Count;

    public IObservable<int> CountChanged => itemsSource.CountChanged;
    
    public IEnumerable<T> Items => itemsSource.Items;
}