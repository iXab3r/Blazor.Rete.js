using Microsoft.AspNetCore.Components.Web;

namespace BlazorReteJs.Scaffolding;

public static class JSComponentConfigurationExtensions
{
    public static void AddBlazorReteJs(this IJSComponentConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        configuration.RegisterForJavaScript<BlazorReteNodeContainer>("blazor-rete-node");
    }
}
