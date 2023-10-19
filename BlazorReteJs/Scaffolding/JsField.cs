using Microsoft.JSInterop;

namespace BlazorReteJs.Scaffolding;

public sealed class JsField<T>
{
    public JsField(IJSRuntime jsRuntime, IJSObjectReference objectRef, string propertyName)
    {
        JsRuntime = jsRuntime;
        ObjectRef = objectRef;
        PropertyName = propertyName;
    }

    public IJSRuntime JsRuntime { get; }
    
    public IJSObjectReference ObjectRef { get; }

    public string PropertyName { get; }
    
    public T Value { get; private set; }
    
    public static implicit operator T(JsField<T> source) => source.Value;

    public async Task<T> GetValue()
    {
        var value = await ObjectRef.GetObjectFieldAsync<T>(JsRuntime, PropertyName);
        ReportValue(value);
        return value;
    }

    public async Task SetValue(T value)
    {
        await ObjectRef.SetObjectPropertyAsync(JsRuntime, PropertyName, value);
        ReportValue(value);
    }
    
    public void ReportValue(T value)
    {
        Value = value;
    }
}