using Microsoft.JSInterop;

namespace BlazorReteJs.Scaffolding;

public static class JsObjectReferenceExtensions
{
    public static async Task<T> GetObjectPropertyAsync<T>(this IJSObjectReference objRef, IJSRuntime jsRuntime, string propName, T defaultValue = default)
    {
        if (objRef is null)
            throw new ArgumentNullException(nameof(objRef));

        var result = await jsRuntime.InvokeAsync<T>("BlazorReteJsInterop.getObjectProperty", objRef, propName, defaultValue);
        return result;
    }

    public static async Task SetObjectPropertyAsync(this IJSObjectReference objRef, IJSRuntime jsRuntime, string propName, object value)
    {
        if (objRef is null)
            throw new ArgumentNullException(nameof(objRef));

        await jsRuntime.InvokeVoidAsync("BlazorReteJsInterop.setObjectProperty", objRef, propName, value);
    }
}
