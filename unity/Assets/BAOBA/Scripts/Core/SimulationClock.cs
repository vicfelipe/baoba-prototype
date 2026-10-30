using System;

namespace Baoba.Core
{
    public interface IClock
    {
        // Monotonic elapsed simulation time, in milliseconds. Pausing freezes Tick.
        long Tick { get; }
    }

    public sealed class SimulationClock : IClock
    {
        private long elapsedTicks;
        public long Tick => elapsedTicks / TimeSpan.TicksPerMillisecond;
        public bool IsPaused { get; private set; }
        public void SetPaused(bool paused) => IsPaused = paused;

        public void Advance(TimeSpan elapsed)
        {
            if (elapsed < TimeSpan.Zero)
                throw new ArgumentOutOfRangeException(nameof(elapsed), "Clock cannot run backwards.");
            if (!IsPaused)
                elapsedTicks = checked(elapsedTicks + elapsed.Ticks);
        }
    }
}
