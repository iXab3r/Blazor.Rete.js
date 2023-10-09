using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Nodes;

public class ReteConnection
{
    private readonly IJSObjectReference connectionRef;

    public ReteConnection(IJSRuntime jsRuntime, IJSObjectReference connectionRef)
    {
        this.connectionRef = connectionRef;
        Id = new JsProperty<string>(jsRuntime, connectionRef, "id");
        Target = new JsProperty<string>(jsRuntime, connectionRef, "target");
        SourceOutput = new JsProperty<string>(jsRuntime, connectionRef, "sourceOutput");
        TargetInput = new JsProperty<string>(jsRuntime, connectionRef, "targetInput");
    }
    
    public JsProperty<string> Id { get; }
    
    public JsProperty<string> Target { get; }
    
    public JsProperty<string> SourceOutput { get; }
    
    public JsProperty<string> TargetInput { get; }

    public override string ToString()
    {
        return new { Id = Id.Value, Target = Target.Value, SourceOutput = SourceOutput.Value, TargetInput = TargetInput.Value }.ToString();
    }
}

public class ReteNode
{
    private readonly IJSObjectReference nodeRef;

    public ReteNode(IJSRuntime jsRuntime, IJSObjectReference nodeRef)
    {
        this.nodeRef = nodeRef;
        IsActive = new JsProperty<bool>(jsRuntime, nodeRef, "isActive");
        IsSelected = new JsProperty<bool>(jsRuntime, nodeRef, "selected");
        Id = new JsProperty<string>(jsRuntime, nodeRef, "id");
        Label = new JsProperty<string>(jsRuntime, nodeRef, "label");
    }

    public JsProperty<bool> IsSelected { get; }
    
    public JsProperty<bool> IsActive { get; }
    
    public JsProperty<string> Id { get; }
    
    public JsProperty<string> Label { get; }

    public override string ToString()
    {
        return new { Id = Id.Value, Label = Label.Value, IsSelected = IsSelected.Value, IsActive = IsActive.Value }.ToString();
    }
}