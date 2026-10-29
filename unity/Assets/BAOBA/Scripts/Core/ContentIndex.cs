using System;
using System.Collections.Generic;

namespace Baoba.Core
{
    public interface IContentRepository
    {
        T GetRequired<T>(ContentId id) where T : class;
    }

    public interface IContentDefinition
    {
        ContentId Id { get; }
        IReadOnlyList<ContentId> RequiredIds { get; }
    }

    public sealed class ContentIndex : IContentRepository
    {
        private readonly Dictionary<ContentId, IContentDefinition> entries = new Dictionary<ContentId, IContentDefinition>();

        public ContentIndex(IEnumerable<IContentDefinition> definitions)
        {
            if (definitions == null)
                throw new ArgumentNullException(nameof(definitions));
            foreach (var definition in definitions)
            {
                if (definition == null || !definition.Id.IsValid)
                    throw new ArgumentException("Catalog contains a null definition or invalid ID.", nameof(definitions));
                if (entries.ContainsKey(definition.Id))
                    throw new InvalidOperationException("Duplicate content ID: " + definition.Id);
                entries.Add(definition.Id, definition);
            }
            foreach (var pair in entries)
            {
                var required = pair.Value.RequiredIds;
                if (required == null)
                    throw new InvalidOperationException("Null reference list: " + pair.Key);
                foreach (var id in required)
                {
                    if (!id.IsValid || !entries.ContainsKey(id))
                        throw new InvalidOperationException($"Missing content reference: {pair.Key} -> {id}");
                }
            }
        }

        public T GetRequired<T>(ContentId id) where T : class
        {
            if (!id.IsValid)
                throw new ArgumentException("Cannot resolve an invalid content ID.", nameof(id));
            if (!entries.TryGetValue(id, out var definition))
                throw new KeyNotFoundException("Unknown content ID: " + id);
            if (!(definition is T typed))
                throw new InvalidOperationException($"Content {id} is not {typeof(T).FullName}.");
            return typed;
        }
    }
}
