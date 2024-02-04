namespace BlazorReteJs.Services;

internal interface IBlazorReteEditorStorage
{
    IDisposable Add(IBlazorReteEditor editor);
    bool TryGet(ReteEditorId editorId, out IBlazorReteEditor? editor);
    IBlazorReteEditor Get(ReteEditorId nodeId);
}