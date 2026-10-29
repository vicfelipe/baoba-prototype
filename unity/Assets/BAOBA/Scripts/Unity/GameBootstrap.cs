using System;
using System.Collections;
using Baoba.Content;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Baoba.Unity
{
    public sealed class GameBootstrap : MonoBehaviour
    {
        [SerializeField] private BootstrapDefinition definition;
        public static GameBootstrap Current { get; private set; }
        public GameServices Services { get; private set; }
        public bool IsReady => Services != null;
        public bool HasLoadedInitialScene { get; private set; }
        public bool HasFailed { get; private set; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics() => Current = null;

        private void Awake()
        {
            if (Current != null)
            {
                Debug.LogWarning("BAOBA: duplicate Bootstrap discarded.", this);
                Destroy(gameObject);
                return;
            }
            try
            {
                if (definition == null)
                    throw new InvalidOperationException("Bootstrap definition is missing.");
                if (!Application.CanStreamedLevelBeLoaded(definition.InitialScenePath))
                    throw new InvalidOperationException("Bootstrap scene is not available: " + definition.InitialScenePath);
                var repository = definition.CreateRepository();
                var session = repository.GetRequired<SessionDefinition>(definition.SessionId);
                Services = new GameServices(new UnityGameplayClock(), repository, session.Seed);
                Current = this;
                DontDestroyOnLoad(gameObject);
                Debug.Log($"BAOBA_BOOTSTRAP_READY version={Application.version} seed={session.Seed} tick={Services.Clock.Tick}", this);
            }
            catch (Exception error)
            {
                Fail(error.Message);
            }
        }

        private IEnumerator Start()
        {
            if (!IsReady)
                yield break;
            AsyncOperation operation;
            try
            {
                operation = SceneManager.LoadSceneAsync(definition.InitialScenePath, LoadSceneMode.Single);
                if (operation == null)
                    throw new InvalidOperationException("Initial scene load did not start.");
            }
            catch (Exception error)
            {
                Fail(error.Message);
                yield break;
            }
            yield return operation;
            HasLoadedInitialScene = true;
            Debug.Log("BAOBA_BOOTSTRAP_SCENE_READY " + definition.InitialScenePath, this);
        }

        private void Update()
        {
            if (IsReady)
                Services.Clock.Advance(TimeSpan.FromTicks((long)Math.Round(
                    (double)Time.unscaledDeltaTime * TimeSpan.TicksPerSecond, MidpointRounding.AwayFromZero)));
        }

        private void Fail(string message)
        {
            HasFailed = true;
            HasLoadedInitialScene = false;
            Services = null;
            if (Current == this)
                Current = null;
            enabled = false;
            Debug.LogError("BAOBA Bootstrap failed: " + message, this);
        }

        private void OnDestroy()
        {
            if (Current == this)
                Current = null;
            Services = null;
        }
    }
}
