using System.Collections.Generic;
using Baoba.Core;
using UnityEngine;

namespace Baoba.Content
{
    public abstract class ContentDefinition : ScriptableObject, IContentDefinition
    {
        [SerializeField] private string stableId;
        [SerializeField] private string[] requiredIds = new string[0];
        public ContentId Id => new ContentId(stableId);
        public IReadOnlyList<ContentId> RequiredIds
        {
            get
            {
                if (requiredIds == null)
                    throw new System.InvalidOperationException("Missing reference list: " + name);
                var ids = new ContentId[requiredIds.Length];
                for (var index = 0; index < ids.Length; index++)
                    ids[index] = new ContentId(requiredIds[index]);
                return System.Array.AsReadOnly(ids);
            }
        }
    }
}
