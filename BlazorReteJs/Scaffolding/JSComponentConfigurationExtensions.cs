using Microsoft.AspNetCore.Components.Web;

namespace BlazorReteJs.Scaffolding;

public static class JSComponentConfigurationExtensions
{
    public static void AddBlazorReteJs(this IJSComponentConfiguration configuration)
    {
        configuration.RegisterForJavaScript(typeof(BlazorReteNodeContainer), "blazor-rete-node");
    }
}