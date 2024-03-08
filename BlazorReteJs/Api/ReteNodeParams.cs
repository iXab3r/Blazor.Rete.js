using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct ReteNodeParams
{
    [JsonPropertyName("label")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Label { get; init; }
    
    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public string? Id { get; init; }
    
    [JsonPropertyName("maxInputs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int? MaxInputs { get; init; }
    
    [JsonPropertyName("maxOutputs")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public int? MaxOutputs { get; init; }
    
    [JsonPropertyName("x")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? X { get; init; }
    
    [JsonPropertyName("y")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? Y { get; init; }
    
    [JsonPropertyName("width")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? Width { get; init; }
    
    [JsonPropertyName("height")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public float? Height { get; init; }
    
    [JsonPropertyName("autoSize")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public ReteNodeAutoSizeMode? AutoSize { get; init; }
    
    [JsonPropertyName("extraParams")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public object? ExtraParams { get; init; }
}