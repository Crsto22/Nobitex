"use client";

import { Select } from "@/components/ui/select";
import type { SaleProduct } from "@/lib/api/sales";

export function CartVariantSelect({
  product,
  value,
  onChange,
}: {
  product: SaleProduct;
  value: string;
  onChange: (variantId: string) => void;
}) {
  return (
    <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
      <Select
        value={value}
        onChange={onChange}
        ariaLabel={`Cambiar variante de ${product.nombre}`}
        options={product.variantes.map((variant) => ({
          value: variant.varianteId,
          label: `${variant.color.nombre} / ${variant.talla.nombre} · Stock ${variant.stockSucursal ?? variant.stockTotal}`,
        }))}
        fixedMenu
        buttonClassName="h-9 rounded-[12px] px-3 text-[10px]"
        optionClassName="py-2 text-[10px]"
      />
    </div>
  );
}
