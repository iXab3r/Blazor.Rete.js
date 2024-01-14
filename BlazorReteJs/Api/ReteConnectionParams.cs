#nullable enable
using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct ReteConnectionParams
{
    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Id { get; init; }
    
    [JsonPropertyName("sourceNodeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? SourceNodeId { get; init; }
    
    [JsonPropertyName("targetNodeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? TargetNodeId { get; init; }
}