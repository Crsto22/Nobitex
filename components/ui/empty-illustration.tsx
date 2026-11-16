import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const emptyIllustrations = {
  addUser: "/iconos-sistema/agregarusuario.webp",
  cashRegister: "/iconos-sistema/caja.webp",
  warehouseShelves: "/iconos-sistema/cajasalmacen.webp",
  emptyBox: "/iconos-sistema/cajavacia.webp",
  deliveryTruck: "/iconos-sistema/camionenvios.webp",
  loadedCart: "/iconos-sistema/cargacajas.webp",
  cartSettings: "/iconos-sistema/carritoajustes.webp",
  warehouseLocation: "/iconos-sistema/casaalmacen.webp",
  approvedDocument: "/iconos-sistema/documentoaprobado.webp",
  orderChecklist: "/iconos-sistema/ordenescajas.webp",
  reports: "/iconos-sistema/reportes.webp",
  storeLocation: "/iconos-sistema/ubicaciontienda.webp",
  users: "/iconos-sistema/usuarios.webp",
  validatedBoxes: "/iconos-sistema/validarcajas.webp",
  posSale: "/iconos-sistema/ventapos.webp",
} as const;

export type EmptyIllustrationKey = keyof typeof emptyIllustrations;

const sizeClasses = {
  sm: "w-16 sm:w-20",
  md: "w-20 sm:w-24 md:w-28",
  lg: "w-24 sm:w-28 md:w-32",
} as const;

type EmptyIllustrationProps = {
  image: EmptyIllustrationKey;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: keyof typeof sizeClasses;
  titleSize?: "sm" | "lg";
  className?: string;
};

export function EmptyIllustration({
  image,
  title,
  description,
  action,
  size = "md",
  titleSize = "sm",
  className,
}: EmptyIllustrationProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        className,
      )}
    >
      <Image
        src={emptyIllustrations[image]}
        alt=""
        aria-hidden
        width={280}
        height={280}
        className={cn(
          "empty-illustration h-auto shrink-0 object-contain",
          sizeClasses[size],
        )}
      />
      {title ? (
        <p
          className={cn(
            "text-[var(--color-text)] font-medium",
            titleSize === "lg" ? "mt-4 text-lg" : "mt-3 text-sm",
          )}
        >
          {title}
        </p>
      ) : null}
      {description ? (
        <p
          className={cn(
            "mx-auto max-w-md text-[var(--color-muted-foreground)]",
            titleSize === "lg"
              ? "mt-2 text-sm font-medium"
              : "mt-1 text-xs font-circular-regular",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
