using DynamicData;
using DynamicData.Kernel;

namespace BlazorReteJs.Collections;

/// <summary>
/// Container to describe a single change to a cache.
/// </summary>
/// <typeparam name="T">The type of the item.</typeparam>
public readonly struct JsItemChange<T> 
{
    /// <summary>
    /// Gets the reason for the change.
    /// </summary>
    public ListChangeReason Reason { get; init;}

    /// <summary>
    /// Gets the item which has changed.
    /// </summary>
    public T Current { get; init; }

    /// <summary>
    /// Gets the current index.
    /// </summary>
    public int? CurrentIndex { get; init;}

    /// <summary>
    /// Gets the previous change.
    ///
    /// This is only when Reason==ChangeReason.Replace.
    /// </summary>
    public Optional<T> Previous { get; init;}

    /// <summary>
    /// Gets the previous index.
    ///
    /// This is only when Reason==ChangeReason.Replace or ChangeReason.Move.
    /// </summary>
    public int? PreviousIndex { get; init;}
}