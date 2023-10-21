using Microsoft.JSInterop;

namespace BlazorReteJs.Scaffolding;

public sealed class JsField<TSource, TTarget> : IJsField<TTarget>
{
    private readonly IJsField<TSource> source;
    private readonly Func<TSource, TTarget> converterTo;
    private readonly Func<TTarget, TSource> converterFrom;

    public JsField(IJSRuntime jsRuntime, IJSObjectReference nodeRef, string propertyName, Func<TSource, TTarget> converterTo, Func<TTarget, TSource> converterFrom)
        : this(new JsField<TSource>(jsRuntime, nodeRef, propertyName), converterTo, converterFrom)
    {
    }

    public JsField(IJsField<TSource> source, Func<TSource, TTarget> converterTo, Func<TTarget, TSource> converterFrom)
    {
        this.source = source;
        this.converterTo = converterTo;
        this.converterFrom = converterFrom;
    }

    public TTarget Value { get; private set; }

    public async Task<TTarget> GetValue()
    {
        var source = await this.source.GetValue();
        var converted = converterTo(source);
        ReportValue(converted);
        return converted;
    }

    public async Task SetValue(TTarget value)
    {
        var converted = converterFrom(value);
        await this.source.SetValue(converted);
    }

    public void ReportValue(TTarget value)
    {
        Value = value;
    }
}

public sealed class JsField<T> : IJsField<T>
{
    public JsField(
        IJSRuntime jsRuntime,
        IJSObjectReference objectRef,
        string propertyName)
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