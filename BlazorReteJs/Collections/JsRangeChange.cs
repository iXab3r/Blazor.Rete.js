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
    public int? Index { get; init; }
    
    public T[] Items { get; init; }
}