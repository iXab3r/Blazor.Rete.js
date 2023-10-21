﻿using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Api;

public class ReteNode
{
    public ReteNode(string nodeId, IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        IsActive = new JsField<bool>(jsRuntime, nodeRef, "isActive");
        IsBusy = new JsField<bool>(jsRuntime, nodeRef, "isBusy");
        IsSelected = new JsField<bool>(jsRuntime, nodeRef, "selected");
        Label = new JsField<string>(jsRuntime, nodeRef, "label");
        Id = nodeId;
        JsRuntime = jsRuntime;
        NodeRef = nodeRef;
    }

    public JsField<bool> IsSelected { get; }
    
    public JsField<bool> IsActive { get; }
    
    public JsField<bool> IsBusy { get; }
    
    public string Id { get; }
    
    public IJSRuntime JsRuntime { get; }
    
    public IJSObjectReference NodeRef { get; }

    public JsField<string> Label { get; }

    public static async Task<ReteNode> FromJsNode(IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        var id = await nodeRef.GetObjectFieldAsync<string>(jsRuntime, "id");
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