namespace Blazor.Rete.js.Scaffolding;

using Microsoft.JSInterop;
using System.Threading.Tasks;

public static class JsObjectReferenceExtensions
{
    public static async Task<T> GetPropertyAsync<T>(this IJSObjectReference objRef, string propName)
    {
        if(objRef is null)
            throw new ArgumentNullException(nameof(objRef));

        return await objRef.InvokeAsync<T>("getProperty", objRef, propName);
    }

    public static async Task SetPropertyAsync(this IJSObjectReference objRef, string propName, object value)
    {
        if(objRef is null)
            throw new ArgumentNullException(nameof(objRef));

        await objRef.InvokeVoidAsync("setProperty", objRef, propName, value);
    }
}
