using BlazorReteJs.Services;
using Microsoft.Extensions.DependencyInjection;

namespace BlazorReteJs.Scaffolding;

public static class ServiceCollectionExtensions
{
    public static void AddBlazorReteJs(this IServiceCollection serviceCollection)
    {
        //FIXME Maybe make it Scoped?
        serviceCollection.AddSingleton<IBlazorReteEditorStorage, BlazorReteEditorStorage>();
    }
}