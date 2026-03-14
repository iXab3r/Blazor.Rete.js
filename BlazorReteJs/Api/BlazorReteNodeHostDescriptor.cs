using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public readonly record struct BlazorReteNodeHostDescriptor
{
    [JsonPropertyName("componentIdentifier")]
    public string? ComponentIdentifier { get; init; }

    [JsonPropertyName("includeDefaultNodeParameters")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool IncludeDefaultNodeParameters { get; init; }

    [JsonPropertyName("parameters")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public IDictionary<string, object?>? Parameters { get; init; }
}
