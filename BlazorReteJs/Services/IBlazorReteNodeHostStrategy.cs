using BlazorReteJs.Api;

namespace BlazorReteJs.Services;

public enum BlazorReteNodeHostKind
{
    Node,
    DockTemplate
}

public readonly record struct BlazorReteNodeHostContext<TNode>
{
    public required ReteEditorId EditorId { get; init; }

    public string? NodeId { get; init; }

    public string? Label { get; init; }

    public TNode? ExtraParams { get; init; }

    public required BlazorReteNodeHostKind HostKind { get; init; }
}

public interface IBlazorReteNodeHostStrategy
{
    BlazorReteNodeHostDescriptor CreateHost<TNode>(BlazorReteNodeHostContext<TNode> context);
}

internal sealed class DefaultBlazorReteNodeHostStrategy : IBlazorReteNodeHostStrategy
{
    private const string DefaultHostIdentifier = "blazor-rete-node";

    public BlazorReteNodeHostDescriptor CreateHost<TNode>(BlazorReteNodeHostContext<TNode> context)
    {
        return new BlazorReteNodeHostDescriptor
        {
            ComponentIdentifier = DefaultHostIdentifier,
            IncludeDefaultNodeParameters = true
        };
    }
}
