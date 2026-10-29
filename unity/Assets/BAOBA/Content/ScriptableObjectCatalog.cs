using System;
using Baoba.Core;
using UnityEngine;

namespace Baoba.Content
{
    [CreateAssetMenu(menuName = "BAOBA/Content Catalog")]
    public sealed class ScriptableObjectCatalog : ScriptableObject
    {
        [SerializeField] private ContentDefinition[] definitions = new ContentDefinition[0];

        public IContentRepository CreateRepository()
        {
            if (definitions == null)
                throw new InvalidOperationException("Catalog has no definition list: " + name);
            foreach (var definition in definitions)
            {
                if (definition == null)
                    throw new InvalidOperationException("Catalog has a missing asset reference: " + name);
            }
            return new ContentIndex(definitions);
        }
    }
}
