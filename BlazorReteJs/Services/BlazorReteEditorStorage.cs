using System.Collections.Concurrent;
using System.Reactive.Disposables;
using Microsoft.Extensions.Logging;

namespace BlazorReteJs.Services;

internal sealed class BlazorReteEditorStorage : IBlazorReteEditorStorage
{
    private readonly ConcurrentDictionary<ReteEditorId, IBlazorReteEditor> editorsById = new();

    public BlazorReteEditorStorage(ILoggerFactory loggerFactory)
    {
        Log = loggerFactory.CreateLogger(GetType());
    }

    public ILogger Log { get; }
    
    public IDisposable Add(IBlazorReteEditor editor)
    {
        if (editorsById.TryGetValue(editor.Id, out var existing))
        {
            throw new ArgumentException($"Rete Editor with Id {editor.Id} already added: {existing}, tried to add {editor}");
        }
        Log.LogInformation($"Adding new Rete Editor into cache(items: {editorsById.Count}): {editor}");
        editorsById[editor.Id] = editor;
        return Disposable.Create(() =>
        {
            Log.LogInformation($"Removing Rete Editor from the cache(items: {editorsById.Count}): {editor}");
            if (!editorsById.TryRemove(editor.Id, out _))
            {
                throw new InvalidOperationException($"Failed to remove editor by Id {editor.Id}");
            }
        });
    }

    public bool TryGet(ReteEditorId editorId, out IBlazorReteEditor? editor)
    {
        return editorsById.TryGetValue(editorId, out editor);
    }

    public IBlazorReteEditor Get(ReteEditorId nodeId)
    {
        if (!editorsById.TryGetValue(nodeId, out var existing))
        {
            throw new ArgumentException($"Rete Editor with Id {nodeId} not found");
        }

        return existing;
    }
}