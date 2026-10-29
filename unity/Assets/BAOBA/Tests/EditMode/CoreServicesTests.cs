using System;
using System.Collections.Generic;
using Baoba.Core;
using NUnit.Framework;

namespace Baoba.Tests.EditMode
{
    public sealed class CoreServicesTests
    {
        private sealed class Definition : IContentDefinition
        {
            public ContentId Id { get; }
            public IReadOnlyList<ContentId> RequiredIds { get; }
            public Definition(string id, params ContentId[] required)
            {
                Id = new ContentId(id);
                RequiredIds = required;
            }
        }

        [TestCase(null)]
        [TestCase("")]
        [TestCase(" ")]
        [TestCase("ROOT ID")]
        [TestCase("RAÍZ")]
        [TestCase("ROOT\n")]
        public void ContentIdRejectsInvalidText(string value)
        {
            Assert.Throws<ArgumentException>(() => new ContentId(value));
        }

        [Test]
        public void ContentIdsUseOrdinalEqualityAndDefaultIsInvalid()
        {
            var id = new ContentId("SESSION_ARU_MVP_001");
            Assert.That(id, Is.EqualTo(new ContentId(id.Value)));
            Assert.That(id.GetHashCode(), Is.EqualTo(new ContentId(id.Value).GetHashCode()));
            Assert.That(id, Is.Not.EqualTo(new ContentId("session_aru_mvp_001")));
            Assert.That(default(ContentId).IsValid, Is.False);
        }

        [Test]
        public void ClockAccumulatesSubMillisecondTimeAndPauseDoesNotCatchUp()
        {
            var clock = new SimulationClock();
            clock.Advance(TimeSpan.FromTicks(6000));
            clock.Advance(TimeSpan.FromTicks(6000));
            Assert.That(clock.Tick, Is.EqualTo(1));
            clock.SetPaused(true);
            clock.Advance(TimeSpan.FromHours(1));
            Assert.That(clock.Tick, Is.EqualTo(1));
            clock.SetPaused(false);
            clock.Advance(TimeSpan.FromTicks(8000));
            Assert.That(clock.Tick, Is.EqualTo(2));
        }

        [Test]
        public void ClockRejectsBackwardsTimeAndOverflowWithoutMutatingState()
        {
            var clock = new SimulationClock();
            Assert.Throws<ArgumentOutOfRangeException>(() => clock.Advance(TimeSpan.FromTicks(-1)));
            clock.Advance(TimeSpan.MaxValue);
            var before = clock.Tick;
            Assert.Throws<OverflowException>(() => clock.Advance(TimeSpan.FromTicks(1)));
            Assert.That(clock.Tick, Is.EqualTo(before));
        }

        [Test]
        public void ClockIsIndependentOfUpdatePartition()
        {
            var oneStep = new SimulationClock();
            var manySteps = new SimulationClock();
            oneStep.Advance(TimeSpan.FromSeconds(1));
            for (var index = 0; index < 100; index++)
                manySteps.Advance(TimeSpan.FromMilliseconds(10));
            Assert.That(manySteps.Tick, Is.EqualTo(oneStep.Tick));
        }

        [Test]
        public void CatalogResolvesByStableIdAndType()
        {
            var target = new Definition("TARGET");
            var source = new Definition("SOURCE", target.Id);
            var catalog = new ContentIndex(new[] { source, target });
            Assert.That(catalog.GetRequired<Definition>(new ContentId("TARGET")), Is.SameAs(target));
            Assert.Throws<InvalidOperationException>(() => catalog.GetRequired<string>(target.Id));
            Assert.Throws<KeyNotFoundException>(() => catalog.GetRequired<Definition>(new ContentId("MISSING")));
            Assert.Throws<ArgumentException>(() => catalog.GetRequired<Definition>(default));
        }

        [Test]
        public void CatalogRejectsDuplicateIds()
        {
            Assert.Throws<InvalidOperationException>(() => new ContentIndex(new[]
            {
                new Definition("DUPLICATE"), new Definition("DUPLICATE")
            }));
        }

        [Test]
        public void CatalogRejectsMissingReferences()
        {
            Assert.Throws<InvalidOperationException>(() => new ContentIndex(new[]
            {
                new Definition("SOURCE", new ContentId("MISSING"))
            }));
            Assert.Throws<InvalidOperationException>(() => new ContentIndex(new[]
            {
                new Definition("SOURCE", default(ContentId))
            }));
        }

        [Test]
        public void CatalogRejectsNullInputAndEntries()
        {
            Assert.Throws<ArgumentNullException>(() => new ContentIndex(null));
            Assert.Throws<ArgumentException>(() => new ContentIndex(new IContentDefinition[] { null }));
        }
    }
}
