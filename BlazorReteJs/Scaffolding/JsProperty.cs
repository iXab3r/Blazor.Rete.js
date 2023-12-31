using Microsoft.JSInterop;

namespace BlazorReteJs.Scaffolding;

public sealed class JsProperty<T>
{
    private readonly string getterMethodName;
    private readonly string setterMethodName;
    
    public JsProperty(IJSObjectReference objectRef, string propertyName)
    {
        ObjectRef = objectRef;
        PropertyName = propertyName;
        getterMethodName = $"get{propertyName}";
        setterMethodName = $"set{propertyName}";
    }
    
    public IJSObjectReference ObjectRef { get; }
    
    public string PropertyName { get; }
    
    public T Value { get; private set; }
    
    public static implicit operator T(JsProperty<T> source) => source.Value;
    
    public async Task<T> GetValue()
    {
        var value = await ObjectRef.InvokeAsync<T>(getterMethodName);
        ReportValue(value);
        return value;
    }

    public async Task SetValue(T value)
    {
        await ObjectRef.InvokeVoidAsync(setterMethodName, value);
        ReportValue(value);
    }
    
    public void ReportValue(T value)
    {
        Value = value;
    }
}