using System;
using Baoba.Content;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace Baoba.Tests.EditMode
{
    public sealed class ContentAuthoringTests
    {
        [Test]
        public void CatalogRejectsMissingUnityAssetReference()
        {
            var catalog = ScriptableObject.CreateInstance<ScriptableObjectCatalog>();
            try
            {
                var serialized = new SerializedObject(catalog);
                serialized.FindProperty("definitions").arraySize = 1;
                serialized.ApplyModifiedPropertiesWithoutUndo();
                Assert.Throws<InvalidOperationException>(() => catalog.CreateRepository());
            }
            finally { UnityEngine.Object.DestroyImmediate(catalog); }
        }

        [Test]
        public void BootstrapRejectsUnconfiguredDefinition()
        {
            var definition = ScriptableObject.CreateInstance<BootstrapDefinition>();
            try { Assert.Throws<InvalidOperationException>(() => definition.CreateRepository()); }
            finally { UnityEngine.Object.DestroyImmediate(definition); }
        }

        [Test]
        public void AuthoredSessionCanBeResolvedWithoutLoadingAScene()
        {
            var definition = AssetDatabase.LoadAssetAtPath<BootstrapDefinition>(Baoba.Editor.BootstrapSetup.DefinitionPath);
            Assert.That(definition, Is.Not.Null);
            var repository = definition.CreateRepository();
            Assert.That(repository.GetRequired<SessionDefinition>(definition.SessionId), Is.Not.Null);
        }
    }
}
