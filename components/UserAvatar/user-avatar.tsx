import { UserIcon } from "@phosphor-icons/react/ssr";

const avatarColors = [
  "#101d69",
  "#1d4ed8",
  "#0ea5e9",
  "#0d9488",
  "#16a34a",
  "#ca8a04",
  "#fd741a",
  "#dc2626",
  "#7c3aed",
  "#db2777",
];

function hashSeed(seed: string | number) {
  return Array.from(String(seed)).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
}

export function getUserAvatarColor(seed: string | number) {
  return avatarColors[hashSeed(seed) % avatarColors.length];
}

export function UserAvatar({
  seed,
  name = "Usuario",
  size = 40,
  className = "",
}: {
  seed: string | number;
  name?: string;
  size?: number;
  className?: string;
}) {
  const trimmedName = name.trim();
  const initial = trimmedName.charAt(0).toUpperCase();

  return (
    <span
      role="img"
      aria-label={`Avatar de ${trimmedName || "Usuario"}`}
      title={trimmedName || undefined}
      style={{
        width: size,
        height: size,
        backgroundColor: getUserAvatarColor(seed),
        fontSize: Math.round(size * 0.42),
      }}
      className={`grid shrink-0 place-items-center rounded-full font-circular-bold uppercase leading-none text-white ${className}`}
    >
      {initial || "?"}
    </span>
  );
}

export function GenericClientAvatar({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-white ${className}`}
    >
      <UserIcon size={Math.round(size * 0.6)} weight="fill" />
    </span>
  );
}
