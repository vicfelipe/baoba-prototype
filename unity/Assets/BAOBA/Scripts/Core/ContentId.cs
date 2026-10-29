using System;

namespace Baoba.Core
{
    public readonly struct ContentId : IEquatable<ContentId>
    {
        public string Value { get; }
        public bool IsValid => !string.IsNullOrEmpty(Value);

        public ContentId(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException("Content ID must not be empty.", nameof(value));
            foreach (var character in value)
            {
                if (character > 127 || char.IsWhiteSpace(character) || char.IsControl(character))
                    throw new ArgumentException("Content ID must contain printable ASCII without whitespace.", nameof(value));
            }
            Value = value;
        }

        public bool Equals(ContentId other) => string.Equals(Value, other.Value, StringComparison.Ordinal);
        public override bool Equals(object obj) => obj is ContentId other && Equals(other);
        public override int GetHashCode() => Value == null ? 0 : StringComparer.Ordinal.GetHashCode(Value);
        public override string ToString() => Value ?? string.Empty;
        public static bool operator ==(ContentId left, ContentId right) => left.Equals(right);
        public static bool operator !=(ContentId left, ContentId right) => !left.Equals(right);
    }
}
