using System.Reactive.Disposables;
using System.Reactive.Linq;
using DynamicData;
using DynamicData.Kernel;
using Microsoft.JSInterop;

namespace BlazorReteJs.Collections;

internal sealed class JsObservableCacheFacade<T, TKey> : IObservableCache<T, TKey> where T : notnull where TKey : notnull
{
    private readonly IJSObjectReference collectionReference;
    private readonly CompositeDisposable anchors = new();
    private readonly IObservableCache<T, TKey> itemsSource;

    public JsObservableCacheFacade(IJSObjectReference collectionReference, Func<T, TKey> keyExtractor)
    {
        this.collectionReference = collectionReference;
        var listener = JsObservableListenerFacade<JsChange<T>>.CreateObservableUsingFactoryMethod(collectionReference, "listenDotnet");
        itemsSource = listener
            .Select(x => x.ToChange())
            .Select(x => new ChangeSet<T>(new[] {x}))
            .AddKey(keyExtractor)
            .AsObservableCache();
        anchors.Add(itemsSource);
    }
    
    public void Dispose()
    {
        anchors.Dispose();
    }

    public IObservable<IChangeSet<T, TKey>> Connect(Func<T, bool>? predicate = null, bool suppressEmptyChangeSets = true)
    {
        return itemsSource.Connect(predicate, suppressEmptyChangeSets);
    }

    public IObservable<IChangeSet<T, TKey>> Preview(Func<T, bool>? predicate = null)
    {
        return itemsSource.Preview(predicate);
    }

    public IObservable<Change<T, TKey>> Watch(TKey key)
    {
        return itemsSource.Watch(key);
    }

    public IObservable<int> CountChanged => itemsSource.CountChanged;

    public Optional<T> Lookup(TKey key)
    {
        return itemsSource.Lookup(key);
    }

    public int Count => itemsSource.Count;

    public IEnumerable<T> Items => itemsSource.Items;

    public IEnumerable<TKey> Keys => itemsSource.Keys;

    public IEnumerable<KeyValuePair<TKey, T>> KeyValues => itemsSource.KeyValues;
}