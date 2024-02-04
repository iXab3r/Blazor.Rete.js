namespace BlazorReteJs.Api;

public interface IReteDockTemplateHook 
{
    ReteNodeParams HandleTemplateCreate(ReteNodeParams nodeParams);
}