using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace Baoba.Tests.EditMode
{
    public sealed class FoundationTests
    {
        [Serializable]
        private sealed class AssemblyDefinition
        {
            public string name;
            public string[] references;
            public bool noEngineReferences;
        }

        [TestCase("Core")]
        [TestCase("Gameplay")]
        public void DomainAssembliesCannotReferenceUnity(string layer)
        {
            var path = $"Assets/BAOBA/Scripts/{layer}/Baoba.{layer}.asmdef";
            var definition = JsonUtility.FromJson<AssemblyDefinition>(File.ReadAllText(path));
            Assert.That(definition.noEngineReferences, Is.True, path);
            Assert.That(definition.references.All(reference => reference == "Baoba.Core"), Is.True, path);
        }

        [Test]
        public void FoundationConfigurationIsValid()
        {
            Assert.DoesNotThrow(Baoba.Editor.ContentValidator.Validate);
        }

        [Test]
        public void InfrastructureSceneIsAvailableForPlayModeSmoke()
        {
            Assert.That(AssetDatabase.LoadAssetAtPath<SceneAsset>(Baoba.Editor.ProjectSetup.SmokeScenePath), Is.Not.Null);
            Assert.That(EditorBuildSettings.scenes.Any(scene => scene.enabled &&
                scene.path == Baoba.Editor.ProjectSetup.SmokeScenePath), Is.True);
        }
    }
}
