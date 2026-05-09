using DynamicData;

namespace BlazorReteJs.Collections;

public static class JsCollectionsToDynamicDataExtensions
{
    public static RangeChange<T> ToRangeChange<T>(this JsRangeChange<T> change)
    {
        if (change.Items == null)
        {
            throw new InvalidOperationException("Invalid JS observable range change: range.items was null or missing.");
        }

        return new RangeChange<T>(change.Items, change.Index ?? -1);
    }
    
    public static ItemChange<T> ToItemChange<T>(this JsItemChange<T> change) where T : notnull
    {
        if (change.Current is null)
        {
            throw new InvalidOperationException($"Invalid JS observable item change: reason {change.Reason} requires item.current, but the bridge received null or missing data.");
        }

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
            if (change.Item.Current is null)
            {
                throw new InvalidOperationException($"Invalid JS observable collection change: reason {change.Reason} requires item.current, but the bridge received null or missing data.");
            }

            return new Change<T>(change.Reason, change.Item.Current, change.Item.CurrentIndex ?? -1);
        }
        else
        {
            if (change.Reason != ListChangeReason.Clear && change.Range.Items == null)
            {
                throw new InvalidOperationException($"Invalid JS observable collection change: reason {change.Reason} requires range.items, but the bridge received null or missing data.");
            }

            return new Change<T>(change.Reason, change.Range.Items ?? Array.Empty<T>(), change.Range.Index ?? -1);
        }
    }
}
