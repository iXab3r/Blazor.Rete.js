using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Nodes;

public class ReteNode
{
    private readonly IJSObjectReference nodeRef;

    public ReteNode(string nodeId, IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        this.nodeRef = nodeRef;
        IsActive = new JsProperty<bool>(jsRuntime, nodeRef, "isActive");
        IsBusy = new JsProperty<bool>(jsRuntime, nodeRef, "isBusy");
        IsSelected = new JsProperty<bool>(jsRuntime, nodeRef, "selected");
        Id = nodeId;
        Label = new JsProperty<string>(jsRuntime, nodeRef, "label");
    }

    public JsProperty<bool> IsSelected { get; }
    
    public JsProperty<bool> IsActive { get; }
    
    public JsProperty<bool> IsBusy { get; }
    
    public string Id { get; }
    
    public JsProperty<string> Label { get; }

    public static async Task<ReteNode> FromJsNode(IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        var id = await nodeRef.GetObjectPropertyAsync<string>(jsRuntime, "id");
        var result = new ReteNode(id, jsRuntime, nodeRef);
        await result.IsSelected.GetValue();
        await result.IsActive.GetValue();
        await result.Label.GetValue();
        await result.IsBusy.GetValue();
        return result;
    }

    public override string ToString()
    {
        return new { Id, Label = Label.Value, IsSelected = IsSelected.Value, IsActive = IsActive.Value }.ToString();
    }
}