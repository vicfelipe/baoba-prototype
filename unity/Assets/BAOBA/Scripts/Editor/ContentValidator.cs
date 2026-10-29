using System;
using System.Linq;
using Baoba.Content;
using Baoba.Core;
using Baoba.Unity;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace Baoba.Editor
{
    public static class ContentValidator
    {
        [MenuItem("BAOBA/Validation/Validate Project")]
        public static void Validate()
        {
            if (!(GraphicsSettings.defaultRenderPipeline is UniversalRenderPipelineAsset pipeline))
                throw new InvalidOperationException("BAOBA: default rendering pipeline must be URP.");
            if (pipeline.scriptableRenderer == null)
                throw new InvalidOperationException("BAOBA: URP renderer is missing.");

            for (var index = 0; index < QualitySettings.names.Length; index++)
            {
                var qualityPipeline = QualitySettings.GetRenderPipelineAssetAt(index);
                if (qualityPipeline != null && qualityPipeline != pipeline)
                    throw new InvalidOperationException("BAOBA: quality level overrides the project URP asset.");
            }

            var scenes = EditorBuildSettings.scenes.Where(scene => scene.enabled).ToArray();
            if (scenes.Length == 0)
                throw new InvalidOperationException("BAOBA: no enabled build scenes.");
            foreach (var scene in scenes)
            {
                if (AssetDatabase.LoadAssetAtPath<SceneAsset>(scene.path) == null)
                    throw new InvalidOperationException("BAOBA: missing build scene: " + scene.path);
            }
            var definitions = AssetDatabase.FindAssets("t:ContentDefinition", new[] { "Assets/BAOBA" })
                .Select(guid => AssetDatabase.LoadAssetAtPath<ContentDefinition>(AssetDatabase.GUIDToAssetPath(guid))).ToArray();
            _ = new ContentIndex(definitions);
            foreach (var guid in AssetDatabase.FindAssets("t:ScriptableObjectCatalog", new[] { "Assets/BAOBA" }))
                AssetDatabase.LoadAssetAtPath<ScriptableObjectCatalog>(AssetDatabase.GUIDToAssetPath(guid)).CreateRepository();
            var bootstrap = AssetDatabase.LoadAssetAtPath<BootstrapDefinition>(BootstrapSetup.DefinitionPath);
            if (bootstrap == null)
                throw new InvalidOperationException("BAOBA: Bootstrap definition is missing.");
            bootstrap.CreateRepository();
            if (scenes[0].path != BootstrapSetup.ScenePath)
                throw new InvalidOperationException("BAOBA: Bootstrap must be the first enabled build scene.");
            if (!scenes.Any(scene => scene.path == bootstrap.InitialScenePath))
                throw new InvalidOperationException("BAOBA: Bootstrap destination is not enabled in build settings.");
            var preview = EditorSceneManager.OpenPreviewScene(BootstrapSetup.ScenePath);
            try
            {
                var roots = preview.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<GameBootstrap>(true)).ToArray();
                if (roots.Length != 1 || !roots[0].isActiveAndEnabled)
                    throw new InvalidOperationException("BAOBA: Bootstrap scene needs exactly one active root.");
                var binding = new SerializedObject(roots[0]).FindProperty("definition").objectReferenceValue as BootstrapDefinition;
                if (binding == null)
                    throw new InvalidOperationException("BAOBA: Bootstrap scene has no definition binding.");
                binding.CreateRepository();
                if (!scenes.Any(scene => scene.path == binding.InitialScenePath))
                    throw new InvalidOperationException("BAOBA: bound Bootstrap destination is not enabled.");
            }
            finally { EditorSceneManager.ClosePreviewScene(preview); }
            Debug.Log($"BAOBA ContentValidator: PASS; {definitions.Length} definitions, unique IDs and resolved references.");
        }
    }
}
