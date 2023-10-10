using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Nodes;

public class ReteConnection
{
    private readonly IJSObjectReference connectionRef;

    public ReteConnection(string connectionId, IJSRuntime jsRuntime, IJSObjectReference connectionRef)
    {
        this.connectionRef = connectionRef;
        Id = connectionId;
        Source = new JsProperty<string>(jsRuntime, connectionRef, "source");
        Target = new JsProperty<string>(jsRuntime, connectionRef, "target");
        SourceOutput = new JsProperty<string>(jsRuntime, connectionRef, "sourceOutput");
        TargetInput = new JsProperty<string>(jsRuntime, connectionRef, "targetInput");
    }
    
    public string Id { get; }
    
    public JsProperty<string> Target { get; }
    
    public JsProperty<string> Source { get; }
    
    public JsProperty<string> SourceOutput { get; }
    
    public JsProperty<string> TargetInput { get; }
    
    public static async Task<ReteConnection> FromJsConnection(IJSRuntime jsRuntime, IJSObjectReference connectionRef)
    {
        var id = await connectionRef.GetObjectPropertyAsync<string>(jsRuntime, "id");
        var result = new ReteConnection(id, jsRuntime, connectionRef);
        await result.Source.GetValue();
        await result.Target.GetValue();
        await result.TargetInput.GetValue();
        await result.SourceOutput.GetValue();
        return result;
    }

    public override string ToString()
    {
        return new { Id, Target = Target.Value, Source = Source.Value, SourceOutput = SourceOutput.Value, TargetInput = TargetInput.Value }.ToString();
    }
}