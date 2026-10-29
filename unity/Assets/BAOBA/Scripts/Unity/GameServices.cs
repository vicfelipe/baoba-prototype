using System;
using Baoba.Core;

namespace Baoba.Unity
{
    public sealed class GameServices
    {
        public UnityGameplayClock Clock { get; }
        public IContentRepository Content { get; }
        public int SessionSeed { get; }

        public GameServices(UnityGameplayClock clock, IContentRepository content, int sessionSeed)
        {
            Clock = clock ?? throw new ArgumentNullException(nameof(clock));
            Content = content ?? throw new ArgumentNullException(nameof(content));
            SessionSeed = sessionSeed;
        }
    }
}
