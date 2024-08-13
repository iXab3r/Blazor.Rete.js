using DynamicData;

namespace BlazorReteJs.Collections;

public static class JsCollectionsToDynamicDataExtensions
{
    public static RangeChange<T> ToRangeChange<T>(this JsRangeChange<T> change)
    {
        return new RangeChange<T>(change.Items, change.Index ?? -1);
    }
    
    public static ItemChange<T> ToItemChange<T>(this JsItemChange<T> change) where T : notnull
    {
        if (change.Previous.HasValue)
        {
            return new ItemChange<T>(change.Reason, change.Current, change.Previous, change.CurrentIndex ?? -1, change.PreviousIndex ?? -1);
        }
        else
        {
            return new ItemChange<T>(change.Reason, change.Current, change.CurrentIndex.Value);
        }
    }

    public static Change<T> ToChange<T>(this JsChange<T> change) where T : notnull
    {
        if (change.Type == ChangeType.Item)
        {
            return new Change<T>(change.Reason, change.Item.Current, change.Item.CurrentIndex ?? -1);
        }
        else
        {
            return new Change<T>(change.Reason, change.Range.Items ?? Array.Empty<T>(), change.Range.Index ?? -1);
        }
    }
}