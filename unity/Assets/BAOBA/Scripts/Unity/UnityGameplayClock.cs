using System;
using Baoba.Core;

namespace Baoba.Unity
{
    public sealed class UnityGameplayClock : IClock
    {
        private readonly SimulationClock clock = new SimulationClock();
        public long Tick => clock.Tick;
        public bool IsPaused => clock.IsPaused;
        public void SetPaused(bool paused) => clock.SetPaused(paused);
        public void Advance(TimeSpan elapsed) => clock.Advance(elapsed);
    }
}
