using UnityEngine;

namespace Baoba.Content
{
    [CreateAssetMenu(menuName = "BAOBA/Session Definition")]
    public sealed class SessionDefinition : ContentDefinition
    {
        [SerializeField] private int seed;
        public int Seed => seed;
    }
}
