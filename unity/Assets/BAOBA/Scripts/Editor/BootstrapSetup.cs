using System;
using System.Linq;
using Baoba.Content;
using Baoba.Unity;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Baoba.Editor
{
    public static class BootstrapSetup
    {
        public const string ScenePath = "Assets/BAOBA/Scenes/00_Bootstrap.unity";
        public const string DefinitionPath = "Assets/BAOBA/Content/Bootstrap_MVP.asset";
        private const string SessionPath = "Assets/BAOBA/Content/Session_MVP.asset";
        private const string CatalogPath = "Assets/BAOBA/Content/Catalog_MVP.asset";

        public static void Configure()
        {
            var session = LoadOrCreate<SessionDefinition>(SessionPath, serialized =>
            {
                serialized.FindProperty("stableId").stringValue = "SESSION_ARU_MVP_001";
                serialized.FindProperty("seed").intValue = 1442;
            });
            var catalog = LoadOrCreate<ScriptableObjectCatalog>(CatalogPath, serialized =>
            {
                var entries = serialized.FindProperty("definitions");
                entries.arraySize = 1;
                entries.GetArrayElementAtIndex(0).objectReferenceValue = session;
            });
            var definition = LoadOrCreate<BootstrapDefinition>(DefinitionPath, serialized =>
            {
                serialized.FindProperty("catalog").objectReferenceValue = catalog;
                serialized.FindProperty("sessionId").stringValue = session.Id.Value;
                serialized.FindProperty("initialScenePath").stringValue = ProjectSetup.SmokeScenePath;
            });
            AssetDatabase.SaveAssets();

            var previousSetup = EditorSceneManager.GetSceneManagerSetup();
            var canRestore = previousSetup.Length > 0 && previousSetup.All(item => !string.IsNullOrEmpty(item.path));
            try
            {
                var scene = AssetDatabase.LoadAssetAtPath<SceneAsset>(ScenePath) == null
                    ? EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single)
                    : EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);
                var roots = scene.GetRootGameObjects().SelectMany(root => root.GetComponentsInChildren<GameBootstrap>(true)).ToArray();
                if (roots.Length > 1)
                    throw new InvalidOperationException("Bootstrap scene contains multiple roots.");
                var bootstrap = roots.Length == 1 ? roots[0]
                    : new GameObject("BAOBA Bootstrap", typeof(GameBootstrap)).GetComponent<GameBootstrap>();
                var serialized = new SerializedObject(bootstrap);
                var binding = serialized.FindProperty("definition");
                if (binding.objectReferenceValue == null)
                {
                    binding.objectReferenceValue = AssetDatabase.LoadAssetAtPath<BootstrapDefinition>(DefinitionPath);
                    serialized.ApplyModifiedPropertiesWithoutUndo();
                    EditorUtility.SetDirty(bootstrap);
                    EditorSceneManager.MarkSceneDirty(scene);
                }
                if (!EditorSceneManager.SaveScene(scene, ScenePath))
                    throw new InvalidOperationException("Could not save Bootstrap scene.");
            }
            finally
            {
                if (canRestore)
                    EditorSceneManager.RestoreSceneManagerSetup(previousSetup);
            }

            var remaining = EditorBuildSettings.scenes.Where(scene => scene.path != ScenePath).ToList();
            if (remaining.All(scene => scene.path != ProjectSetup.SmokeScenePath))
                remaining.Add(new EditorBuildSettingsScene(ProjectSetup.SmokeScenePath, true));
            remaining.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
            EditorBuildSettings.scenes = remaining.ToArray();
            AssetDatabase.SaveAssets();
        }

        private static T LoadOrCreate<T>(string path, Action<SerializedObject> initialize) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null)
                return asset;
            if (AssetDatabase.LoadMainAssetAtPath(path) != null)
                throw new InvalidOperationException("Asset path occupied: " + path);
            asset = ScriptableObject.CreateInstance<T>();
            var serialized = new SerializedObject(asset);
            initialize(serialized);
            serialized.ApplyModifiedPropertiesWithoutUndo();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }
    }
}
