using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace Baoba.Tests.PlayMode
{
    public sealed class InfrastructureSmokeTests
    {
        private Scene previousScene;
        private Scene loadedScene;

        [UnityTest]
        public IEnumerator InfrastructureSceneLoadsWithCamera()
        {
            previousScene = SceneManager.GetActiveScene();
            yield return SceneManager.LoadSceneAsync("99_InfrastructureSmoke", LoadSceneMode.Additive);
            loadedScene = SceneManager.GetSceneByName("99_InfrastructureSmoke");
            Assert.That(loadedScene.isLoaded, Is.True);
            SceneManager.SetActiveScene(loadedScene);
            var cameraCount = 0;
            foreach (var root in loadedScene.GetRootGameObjects())
                cameraCount += root.GetComponentsInChildren<Camera>().Length;
            Assert.That(cameraCount, Is.EqualTo(1));
            yield return null;
            LogAssert.NoUnexpectedReceived();
        }

        [UnityTearDown]
        public IEnumerator UnloadInfrastructureScene()
        {
            if (previousScene.IsValid() && previousScene.isLoaded)
                SceneManager.SetActiveScene(previousScene);
            if (!loadedScene.IsValid())
                loadedScene = SceneManager.GetSceneByName("99_InfrastructureSmoke");
            if (loadedScene.IsValid() && loadedScene.isLoaded)
                yield return SceneManager.UnloadSceneAsync(loadedScene);
        }
    }
}
