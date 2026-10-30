using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace Baoba.Editor
{
    public static class ProjectSetup
    {
        public const string SmokeScenePath = "Assets/BAOBA/Scenes/99_InfrastructureSmoke.unity";
        public const string PipelinePath = "Assets/BAOBA/Settings/BaobaURP.asset";
        private const string RendererPath = "Assets/BAOBA/Settings/BaobaRenderer.asset";

        [MenuItem("BAOBA/Project/Configure Foundation")]
        public static void Configure()
        {
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                return;

            var renderer = LoadOrCreate<UniversalRendererData>(RendererPath);
            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null)
            {
                if (AssetDatabase.LoadMainAssetAtPath(PipelinePath) != null)
                    throw new InvalidOperationException("URP path occupied by another asset: " + PipelinePath);
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(pipeline, PipelinePath);
            }

            GraphicsSettings.defaultRenderPipeline = pipeline;
            var previousQuality = QualitySettings.GetQualityLevel();
            for (var index = 0; index < QualitySettings.names.Length; index++)
            {
                QualitySettings.SetQualityLevel(index, false);
                QualitySettings.renderPipeline = pipeline;
            }
            QualitySettings.SetQualityLevel(previousQuality, false);

            EditorSettings.serializationMode = SerializationMode.ForceText;
            VersionControlSettings.mode = "Visible Meta Files";
            PlayerSettings.companyName = "BAOBA";
            PlayerSettings.productName = "BAOBA";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.defaultScreenWidth = 1920;
            PlayerSettings.defaultScreenHeight = 1080;

            if (AssetDatabase.LoadAssetAtPath<SceneAsset>(SmokeScenePath) == null)
            {
                var previousSetup = EditorSceneManager.GetSceneManagerSetup();
                var canRestore = previousSetup.Length > 0;
                foreach (var item in previousSetup)
                    canRestore &= !string.IsNullOrEmpty(item.path);
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                var cameraObject = new GameObject("Infrastructure Camera", typeof(Camera));
                SceneManager.MoveGameObjectToScene(cameraObject, scene);
                cameraObject.tag = "MainCamera";
                cameraObject.GetComponent<Camera>().backgroundColor = new Color(0.08f, 0.12f, 0.1f);
                cameraObject.GetComponent<Camera>().clearFlags = CameraClearFlags.SolidColor;
                cameraObject.AddComponent<UniversalAdditionalCameraData>();
                if (!EditorSceneManager.SaveScene(scene, SmokeScenePath))
                    throw new InvalidOperationException("Could not save infrastructure scene.");
                if (canRestore)
                    EditorSceneManager.RestoreSceneManagerSetup(previousSetup);
            }

            // Preserve a developer's build scene list once it has been configured.
            if (EditorBuildSettings.scenes.Length == 0)
                EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(SmokeScenePath, true) };

            AssetDatabase.SaveAssets();
            BootstrapSetup.Configure();
            ContentValidator.Validate();
            Debug.Log("BAOBA M0: foundation and Bootstrap configured; technical destination only.");
        }

        private static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset != null)
                return asset;
            if (AssetDatabase.LoadMainAssetAtPath(path) != null)
                throw new InvalidOperationException("Asset path occupied: " + path);
            asset = ScriptableObject.CreateInstance<T>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }
    }
}
