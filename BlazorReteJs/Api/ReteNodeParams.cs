namespace BlazorReteJs.Api;

public readonly record struct ReteNodeParams
{
    public string Label { get; init; }
    public string LabelPrefix { get; init; }
    public string LabelSuffix { get; init; }
    public string Body { get; init; }
    public string Id { get; init; }
    public int? MaxInputs { get; init; }
    public int? MaxOutputs { get; init; }
    public float? X { get; init; }
    public float? Y { get; init; }
    public ReteNodeStatus? Status { get; init; }
    public bool? IsBusy { get; init; }
}