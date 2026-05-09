using DynamicData;
using DynamicData.Kernel;

using System.Text.Json.Serialization;

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
    [JsonPropertyName("reason")]
    public ListChangeReason Reason { get; init;}

    /// <summary>
    /// Gets the item which has changed.
    /// </summary>
    [JsonPropertyName("current")]
    public T Current { get; init; }

    /// <summary>
    /// Gets the current index.
    /// </summary>
    [JsonPropertyName("currentIndex")]
    public int? CurrentIndex { get; init;}

    /// <summary>
    /// Gets the previous change.
    ///
    /// This is only when Reason==ChangeReason.Replace.
    /// </summary>
    [JsonPropertyName("previous")]
    public Optional<T> Previous { get; init;}

    /// <summary>
    /// Gets the previous index.
    ///
    /// This is only when Reason==ChangeReason.Replace or ChangeReason.Move.
    /// </summary>
    [JsonPropertyName("previousIndex")]
    public int? PreviousIndex { get; init;}
}
