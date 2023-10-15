using System.ComponentModel;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

/// <summary>
/// Alignment of the selected node relative to other nodes; the exact meaning depends on the used algorithm.
/// </summary>
[JsonConverter(typeof(JsonStringEnumMemberConverter))] 
public enum ReteArrangeAlignment
{
    [Description(nameof(Automatic))]
    [EnumMember(Value = "AUTOMATIC")]
    Automatic,
    [Description(nameof(Left))]
    [EnumMember(Value = "LEFT")]
    Left,
    [Description(nameof(Right))]
    [EnumMember(Value = "RIGHT")]
    Right,
    [Description(nameof(Top))]
    [EnumMember(Value = "TOP")]
    Top,
    [Description(nameof(Bottom))]
    [EnumMember(Value = "BOTTOM")]
    Bottom,
    [Description(nameof(Center))]
    [EnumMember(Value = "CENTER")]
    Center,
}