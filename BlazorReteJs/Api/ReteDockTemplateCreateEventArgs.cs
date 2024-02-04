namespace BlazorReteJs.Api;

public sealed class ReteDockTemplateCreateEventArgs : EventArgs
{
    public ReteNodeParams NodeParams { get; set; }
    
    public bool IsHandled { get; set; }
}