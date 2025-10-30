using BlazorReteJs.Scaffolding;
using Microsoft.AspNetCore.Components.Web;

namespace BlazorReteJs.Services;

internal interface IBlazorReteComponentRegistrator
{
}

internal sealed class BlazorReteComponentRegistrator : IBlazorReteComponentRegistrator
{
    public BlazorReteComponentRegistrator(IJSComponentConfiguration componentConfiguration)
    {
        //FIXME This approach does not work - JSComponentConfiguration is sent only ONCE before the page is loaded
        //componentConfiguration.AddBlazorReteJs();
    }
}