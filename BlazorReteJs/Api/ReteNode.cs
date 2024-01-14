using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Api;

public class ReteNode
{
    public ReteNode(string nodeId, IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        Id = nodeId;
        JsRuntime = jsRuntime;
        NodeRef = nodeRef;
        IsBusy = new JsField<bool>(jsRuntime, nodeRef, "isBusy");
        IsSelected = new JsField<bool>(jsRuntime, nodeRef, "selected");
        Label = new JsField<string>(jsRuntime, nodeRef, "label");
    }

    public string Id { get; }
    
    public JsField<string> Label { get; }
    
    public JsField<bool> IsSelected { get; }
    
    public JsField<bool> IsBusy { get; }
    
    public IJSRuntime JsRuntime { get; }
    
    public IJSObjectReference NodeRef { get; }

    public async Task<ReteNodeParams> GetParams()
    {
        return await NodeRef.InvokeAsync<ReteNodeParams>("getParams");
    }
    
    public async Task<bool> UpdateParams(ReteNodeParams nodeParams)
    {
        return await NodeRef.InvokeAsync<bool>("updateParams", nodeParams);
    }

    public static ReteNode FromJsNode(IJSRuntime jsRuntime, IJSObjectReference nodeRef, string id)
    {
        var result = new ReteNode(id, jsRuntime, nodeRef);
        return result;
    }
    
    public static async Task<ReteNode> FromJsNode(IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        var id = await nodeRef.GetObjectFieldAsync<string>(jsRuntime, "id");
        var result = FromJsNode(jsRuntime, nodeRef, id);
        return result;
    }

    public override string ToString()
    {
        return new { Id }.ToString();
    }
}