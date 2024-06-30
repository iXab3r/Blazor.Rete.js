using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct ReteRectangle
{
    [JsonPropertyName("x")]
    public float X { get; init; }
    
    [JsonPropertyName("y")]
    public float Y { get; init; }
    
    [JsonPropertyName("width")]
    public float Width { get; init; }
    
    [JsonPropertyName("height")]
    public float Height { get; init; }
}