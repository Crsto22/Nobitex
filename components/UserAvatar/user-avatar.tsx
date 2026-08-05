import Image from "next/image";
import { UserIcon } from "@phosphor-icons/react/ssr";

const avatars = Array.from(
  { length: 18 },
  (_, index) => `/avatar/avatar%20(${index + 1}).png`,
);

export function getUserAvatar(seed: string | number) {
  const index =
    Array.from(String(seed)).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) % avatars.length;

  return avatars[index];
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
  return (
    <Image
      src={getUserAvatar(seed)}
      alt={`Avatar de ${name}`}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
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
