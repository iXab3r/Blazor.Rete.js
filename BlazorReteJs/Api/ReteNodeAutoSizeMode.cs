using System.ComponentModel;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace BlazorReteJs.Api;

public enum ReteNodeAutoSizeMode
{
    [Description(nameof(None))]
    [EnumMember(Value = "None")]
    None,
    [Description(nameof(Width))]
    [EnumMember(Value = "Width")]
    Width,
    [Description(nameof(Height))]
    [EnumMember(Value = "Height")]
    Height,
    [Description(nameof(WidthAndHeight))]
    [EnumMember(Value = "WidthAndHeight")]
    WidthAndHeight,
}