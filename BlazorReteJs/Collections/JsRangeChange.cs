using System.Text.Json.Serialization;

namespace BlazorReteJs.Collections;

/// <summary>
/// Multiple change container.
/// </summary>
/// <typeparam name="T">The type of the item.</typeparam>
public readonly record struct JsRangeChange<T>
{
    /// <summary>
    /// Gets the index initial index i.e. for the initial starting point of the range insertion.
    /// </summary>
    /// <value>
    /// The index.
    /// </value>
    [JsonPropertyName("index")]
    public int? Index { get; init; }

    [JsonPropertyName("items")]
    public T[] Items { get; init; }
}
