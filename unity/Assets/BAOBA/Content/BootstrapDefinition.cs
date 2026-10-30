using System;
using Baoba.Core;
using UnityEngine;

namespace Baoba.Content
{
    [CreateAssetMenu(menuName = "BAOBA/Bootstrap Definition")]
    public sealed class BootstrapDefinition : ScriptableObject
    {
        [SerializeField] private ScriptableObjectCatalog catalog;
        [SerializeField] private string sessionId;
        [SerializeField] private string initialScenePath;
        public string InitialScenePath => initialScenePath;

        public IContentRepository CreateRepository()
        {
            if (catalog == null)
                throw new InvalidOperationException("Bootstrap catalog is missing.");
            if (string.IsNullOrWhiteSpace(initialScenePath))
                throw new InvalidOperationException("Bootstrap initial scene path is missing.");
            var repository = catalog.CreateRepository();
            repository.GetRequired<SessionDefinition>(SessionId);
            return repository;
        }

        public ContentId SessionId => new ContentId(sessionId);
    }
}
