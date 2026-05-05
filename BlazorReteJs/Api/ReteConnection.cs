using BlazorReteJs.Scaffolding;
using Microsoft.JSInterop;

namespace BlazorReteJs.Api;

public class ReteConnection
{
    private readonly IJSObjectReference connectionRef;

    public ReteConnection(string connectionId, IJSRuntime jsRuntime, IJSObjectReference connectionRef)
    {
        this.connectionRef = connectionRef;
        Id = connectionId;
        Source = new JsField<string>(jsRuntime, connectionRef, "source");
        Target = new JsField<string>(jsRuntime, connectionRef, "target");
        SourcePinId = new JsField<string>(jsRuntime, connectionRef, "sourceOutput");
        TargetPinId = new JsField<string>(jsRuntime, connectionRef, "targetInput");
        IsActive = new JsField<bool>(jsRuntime, connectionRef, "isActive");
    }

    public string Id { get; }

    public JsField<string> Target { get; }

    public JsField<string> Source { get; }

    public JsField<string> SourcePinId { get; }

    public JsField<string> TargetPinId { get; }

    public JsField<bool> IsActive { get; }

    public static async Task<ReteConnection> FromJsConnection(IJSRuntime jsRuntime, IJSObjectReference connectionRef)
    {
        var id = await connectionRef.GetObjectFieldAsync<string>(jsRuntime, "id");
        var result = new ReteConnection(id, jsRuntime, connectionRef);
        await result.Source.GetValue();
        await result.Target.GetValue();
        await result.SourcePinId.GetValue();
        await result.TargetPinId.GetValue();
        return result;
    }

    public static ReteConnection FromJsConnection(IJSRuntime jsRuntime, IJSObjectReference connectionRef, ReteConnectionParams connectionParams)
    {
        var result = new ReteConnection(connectionParams.Id!, jsRuntime, connectionRef);
        result.Source.ReportValue(connectionParams.SourceNodeId!);
        result.Target.ReportValue(connectionParams.TargetNodeId!);
        result.SourcePinId.ReportValue(connectionParams.SourcePinId!);
        result.TargetPinId.ReportValue(connectionParams.TargetPinId!);
        return result;
    }

    public override string ToString()
    {
        return new { Id, Target = Target.Value, Source = Source.Value }.ToString();
    }
}
