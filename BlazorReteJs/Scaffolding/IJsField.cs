namespace BlazorReteJs.Scaffolding;

public interface IJsField<T>
{
    T Value { get; }
    Task<T> GetValue();
    Task SetValue(T value);
}