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

    [JsonPropertyName("sourcePinId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? SourcePinId { get; init; }

    [JsonPropertyName("targetNodeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? TargetNodeId { get; init; }

    [JsonPropertyName("targetPinId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? TargetPinId { get; init; }

    [JsonPropertyName("family")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Family { get; init; }

    [JsonPropertyName("order")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int? Order { get; init; }
}
