namespace BlazorReteJs.Api;

public readonly record struct ReteNodePosition
{
    public string Id { get; init; }
    public float? X { get; init; }
    public float? Y { get; init; }
}