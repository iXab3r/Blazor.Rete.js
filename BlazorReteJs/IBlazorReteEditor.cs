using Microsoft.AspNetCore.Components;

namespace BlazorReteJs;

internal interface IBlazorReteEditor
{
    ReteEditorId Id { get; }
}

internal interface IBlazorReteEditor<TNode> : IBlazorReteEditor
{
    RenderFragment<BlazorReteNode<TNode>>? NodeTemplate { get; }
}