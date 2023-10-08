using Blazor.Rete.js.Scaffolding;
using Microsoft.JSInterop;

namespace Blazor.Rete.js.Nodes;

public class ReteNode
{
    private readonly IJSObjectReference nodeRef;

    public ReteNode(IJSObjectReference nodeRef)
    {
        this.nodeRef = nodeRef;
    }

    public bool IsActive
    {
        get; 
        private set;
    }

    public async Task SetIsActive(bool isActive)
    {
        await nodeRef.SetPropertyAsync(nameof(IsActive), isActive);
    }
}