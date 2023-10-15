using System.ComponentModel;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

/// <summary>
/// Overall direction of edges: horizontal (right / left) or vertical (down / up).
/// </summary>
[JsonConverter(typeof(JsonStringEnumMemberConverter))] 
public enum ReteArrangeDirection
{
    [Description(nameof(Undefined))]
    [EnumMember(Value = "UNDEFINED")]
    Undefined,
    [Description(nameof(Right))]
    [EnumMember(Value = "RIGHT")]
    Right,
    [Description(nameof(Left))]
    [EnumMember(Value = "LEFT")]
    Left,
    [Description(nameof(Down))]
    [EnumMember(Value = "DOWN")]
    Down,
    [Description(nameof(Up))]
    [EnumMember(Value = "UP")]
    Up,
}