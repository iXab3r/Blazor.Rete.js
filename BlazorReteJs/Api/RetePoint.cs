using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct RetePoint
{
    [JsonPropertyName("x")]
    public float X { get; init; }
    
    [JsonPropertyName("y")]
    public float Y { get; init; }
}