using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct ReteNodePosition
{
    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string Id { get; init; }
    
    [JsonPropertyName("x")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? X { get; init; }
    
    [JsonPropertyName("y")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? Y { get; init; }
}