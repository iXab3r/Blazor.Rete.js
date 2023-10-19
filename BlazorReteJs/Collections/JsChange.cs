using DynamicData;

namespace BlazorReteJs.Collections;

/// <summary>
///   Container to describe a single change to a cache.
/// </summary>
/// <typeparam name="T">The type of the item.</typeparam>
public readonly record struct JsChange<T> 
{
    /// <summary>
    /// Gets a single item change.
    /// </summary>
    public JsItemChange<T> Item { get; init; }

    /// <summary>
    /// Gets a multiple item change.
    /// </summary>
    public JsRangeChange<T> Range { get; init;}

    /// <summary>
    /// Gets the reason for the change.
    /// </summary>
    public ListChangeReason Reason { get; init;}

    /// <summary>
    /// Gets a value indicating whether the change is a single item change or a range change.
    /// </summary>
    /// <value>
    /// The type.
    /// </value>
    public ChangeType Type => Reason.GetChangeType();
}