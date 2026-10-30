using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Baoba.Unity
{
    // Explicit command-line probe for M0 builds, never active during normal play.
    public sealed class InfrastructureSmokeProbe : MonoBehaviour
    {
        private bool hasErrors;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void StartWhenRequested()
        {
            if (Application.isEditor || Array.IndexOf(Environment.GetCommandLineArgs(), "-baobaSmoke") < 0)
                return;
            var probe = new GameObject("Infrastructure Smoke Probe");
            DontDestroyOnLoad(probe);
            probe.AddComponent<InfrastructureSmokeProbe>();
        }

        private void OnEnable()
        {
            Application.logMessageReceived += ObserveLog;
        }

        private void OnDisable()
        {
            Application.logMessageReceived -= ObserveLog;
        }

        private void ObserveLog(string message, string stackTrace, LogType type)
        {
            if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert)
                hasErrors = true;
        }

        private IEnumerator Start()
        {
            var deadline = Time.realtimeSinceStartupAsDouble + 10;
            while ((GameBootstrap.Current == null || !GameBootstrap.Current.HasLoadedInitialScene) &&
                !hasErrors && Time.realtimeSinceStartupAsDouble < deadline)
                yield return null;
            for (var frame = 0; frame < 3; frame++)
                yield return null;
            var scene = SceneManager.GetActiveScene();
            var cameraCount = 0;
            foreach (var root in scene.GetRootGameObjects())
                cameraCount += root.GetComponentsInChildren<Camera>().Length;
            if (hasErrors || !scene.isLoaded || cameraCount == 0 ||
                GameBootstrap.Current == null || !GameBootstrap.Current.IsReady ||
                !GameBootstrap.Current.HasLoadedInitialScene)
            {
                Debug.LogError("BAOBA_INFRASTRUCTURE_SMOKE_FAIL: startup errors, scene or camera missing.");
                Application.Quit(1);
                yield break;
            }
            Debug.Log("BAOBA_INFRASTRUCTURE_SMOKE_PASS");
            Application.Quit(0);
        }
    }
}
