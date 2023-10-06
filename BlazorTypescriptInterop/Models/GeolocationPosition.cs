namespace BlazorTypescriptInterop.Models;

public class GeolocationPosition
{
    public GeolocationCoordinates Coords { get; set; } = new();
    public long Timestamp { get; set; }
}
