using BlazorReteJs.Playground;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.Extensions.Hosting;
using Index = BlazorReteJs.Playground.Pages.Index;

var builder = Host.CreateDefaultBuilder().ConfigureWebHostDefaults(webBuilder =>
{
    webBuilder
        .ConfigureServices(ConfigureServices)
        .Configure((context, applicationBuilder) => Configure(context.HostingEnvironment, applicationBuilder))
        .UseStaticWebAssets();
});

await builder.Build().RunAsync();


void ConfigureServices(IServiceCollection services)
{
    services.AddRazorPages();
    services.AddServerSideBlazor();
}

void Configure(IWebHostEnvironment env, IApplicationBuilder app)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
    }
    else
    {
        app.UseExceptionHandler("/Error");
        app.UseHsts();
    }

    app.UseHttpsRedirection();
    app.UseStaticFiles();

    app.UseRouting();

    app.UseEndpoints(endpoints =>
    {
        endpoints.MapBlazorHub();
        endpoints.MapFallbackToPage("/_Host");
    });
}