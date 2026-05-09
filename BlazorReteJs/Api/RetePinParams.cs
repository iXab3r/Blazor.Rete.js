using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct RetePinParams
{
    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Name { get; init; }

    [JsonPropertyName("family")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Family { get; init; }

    [JsonPropertyName("direction")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Direction { get; init; }

    [JsonPropertyName("side")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Side { get; init; }

    [JsonPropertyName("valueTypeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? ValueTypeId { get; init; }

    [JsonPropertyName("maxConnections")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int? MaxConnections { get; init; }

    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Description { get; init; }

    [JsonPropertyName("tooltip")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Tooltip { get; init; }

    [JsonPropertyName("isPrimary")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? IsPrimary { get; init; }

    [JsonPropertyName("isAdvanced")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? IsAdvanced { get; init; }

    [JsonPropertyName("menuOrder")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int? MenuOrder { get; init; }

    [JsonPropertyName("coordinateTypeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? CoordinateTypeId { get; init; }

    [JsonPropertyName("compatibleValueTypeIds")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public IReadOnlyList<string>? CompatibleValueTypeIds { get; init; }

    [JsonPropertyName("previewValue")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public object? PreviewValue { get; init; }

    [JsonPropertyName("previewText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? PreviewText { get; init; }

    [JsonPropertyName("previewChangedAt")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime? PreviewChangedAt { get; init; }

    [JsonPropertyName("isEvaluating")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? IsEvaluating { get; init; }

    [JsonPropertyName("flowState")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? FlowState { get; init; }

    [JsonPropertyName("pinRole")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? PinRole { get; init; }
}
