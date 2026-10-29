using System.Collections;
using System.Text.RegularExpressions;
using Baoba.Content;
using Baoba.Core;
using Baoba.Unity;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace Baoba.Tests.PlayMode
{
    public sealed class BootstrapTests
    {
        private GameObject invalidRoot;

        [UnityTest]
        public IEnumerator ServicesSurviveSceneLoadAndClockRespectsPause()
        {
            Assert.That(GameBootstrap.Current, Is.Null);
            LogAssert.Expect(LogType.Log, new Regex("^BAOBA_BOOTSTRAP_READY version=.+ seed=-?[0-9]+ tick=0$"));
            LogAssert.Expect(LogType.Log, "BAOBA_BOOTSTRAP_SCENE_READY Assets/BAOBA/Scenes/99_InfrastructureSmoke.unity");
            yield return SceneManager.LoadSceneAsync("00_Bootstrap", LoadSceneMode.Additive);
            var bootstrap = GameBootstrap.Current;
            Assert.That(bootstrap, Is.Not.Null);
            Assert.That(bootstrap.IsReady, Is.True, "Services must be ready before destination scene finishes loading.");
            var services = bootstrap.Services;
            var deadline = Time.realtimeSinceStartupAsDouble + 10;
            while (!bootstrap.HasLoadedInitialScene && Time.realtimeSinceStartupAsDouble < deadline)
                yield return null;
            Assert.That(bootstrap.HasLoadedInitialScene, Is.True);
            Assert.That(SceneManager.GetActiveScene().name, Is.EqualTo("99_InfrastructureSmoke"));
            Assert.That(GameBootstrap.Current.Services, Is.SameAs(services));
            Assert.That(services.Content.GetRequired<SessionDefinition>(new ContentId("SESSION_ARU_MVP_001")).Seed,
                Is.EqualTo(services.SessionSeed));

            var before = services.Clock.Tick;
            yield return new WaitForSecondsRealtime(0.05f);
            Assert.That(services.Clock.Tick, Is.GreaterThan(before));
            services.Clock.SetPaused(true);
            var paused = services.Clock.Tick;
            yield return new WaitForSecondsRealtime(0.05f);
            Assert.That(services.Clock.Tick, Is.EqualTo(paused));
            services.Clock.SetPaused(false);
            yield return new WaitForSecondsRealtime(0.05f);
            Assert.That(services.Clock.Tick, Is.GreaterThan(paused));

            LogAssert.Expect(LogType.Warning, "BAOBA: duplicate Bootstrap discarded.");
            yield return SceneManager.LoadSceneAsync("00_Bootstrap", LoadSceneMode.Additive);
            yield return null;
            Assert.That(GameBootstrap.Current, Is.SameAs(bootstrap));
            Assert.That(bootstrap.Services, Is.SameAs(services));
            LogAssert.NoUnexpectedReceived();
        }

        [UnityTest]
        public IEnumerator MissingConfigurationFailsWithoutPublishingServices()
        {
            LogAssert.Expect(LogType.Error, "BAOBA Bootstrap failed: Bootstrap definition is missing.");
            invalidRoot = new GameObject("Unconfigured Bootstrap", typeof(GameBootstrap));
            var bootstrap = invalidRoot.GetComponent<GameBootstrap>();
            yield return null;
            Assert.That(bootstrap.HasFailed, Is.True);
            Assert.That(bootstrap.IsReady, Is.False);
            Assert.That(GameBootstrap.Current, Is.Null);
        }

        [UnityTearDown]
        public IEnumerator Cleanup()
        {
            if (invalidRoot != null)
                Object.Destroy(invalidRoot);
            if (GameBootstrap.Current != null)
                Object.Destroy(GameBootstrap.Current.gameObject);
            yield return null;
            Assert.That(GameBootstrap.Current, Is.Null);
            // Single-mode destination loading can unload the test's original scene.
            var active = SceneManager.GetActiveScene();
            if (active.name == "99_InfrastructureSmoke" || active.name == "00_Bootstrap")
            {
                var cleanup = SceneManager.CreateScene("Bootstrap Test Cleanup");
                SceneManager.SetActiveScene(cleanup);
            }
            foreach (var name in new[] { "00_Bootstrap", "99_InfrastructureSmoke" })
            {
                var scene = SceneManager.GetSceneByName(name);
                if (scene.IsValid() && scene.isLoaded)
                    yield return SceneManager.UnloadSceneAsync(scene);
            }
        }
    }
}
