"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  CheckIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react/ssr";
import { Modal } from "@/components/Modal/modal";
import { cn } from "@/lib/utils";

function samePrice(left: number, right: number) {
  return Math.abs(left - right) < 0.005;
}

export function CartPriceInput({
  currentPrice,
  salePrice,
  wholesalePrice,
  onApply,
  onClose,
}: {
  currentPrice: number;
  salePrice: number;
  wholesalePrice: number | null;
  onApply: (price: number) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentPrice.toFixed(2));
  const [error, setError] = useState("");

  const apply = () => {
    const price = Number(draft.replace(",", "."));
    if (!Number.isFinite(price) || price < 0.01 || price > 999_999.99) {
      setError("Ingresa un precio valido");
      return;
    }
    onApply(Number(price.toFixed(2)));
  };

  return (
    <Modal isOpen onClose={onClose} title="Precio del producto" size="sm">
      <div className="mb-4 rounded-[14px] bg-[var(--color-primary)] px-4 py-3 text-white">
        <p className="text-[10px] font-circular-bold uppercase text-white/70">
          Precio actual
        </p>
        <p className="mt-1 text-xl font-circular-bold">
          S/{currentPrice.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PriceOption
          label="Precio normal"
          description="Precio regular"
          price={salePrice}
          active={samePrice(currentPrice, salePrice)}
          dotClassName="bg-slate-400"
          onClick={() => onApply(salePrice)}
        />
        {wholesalePrice !== null && wholesalePrice > 0 ? (
          <PriceOption
            label="Precio por mayor"
            description="Precio mayorista"
            price={wholesalePrice}
            active={samePrice(currentPrice, wholesalePrice)}
            dotClassName="bg-amber-400"
            onClick={() => onApply(wholesalePrice)}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setError("");
        }}
        className="mt-3 flex h-11 w-full items-center gap-2 rounded-[12px] bg-[var(--color-input-bg)] px-3 text-left text-sm font-circular-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-button-hover)] hover:text-[var(--color-primary)]"
      >
        <PencilSimpleIcon size={14} />
        Editar precio manualmente
      </button>

      {editing ? (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex h-11 min-w-0 items-center rounded-[12px] bg-[var(--color-input-bg)] px-3 ring-1 ring-[var(--color-primary)]/20">
            <span className="mr-1 text-xs font-circular-bold text-[var(--color-muted-foreground)]">
              S/
            </span>
            <input
              autoFocus
              type="number"
              min="0.01"
              max="999999.99"
              step="0.01"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") apply();
                if (event.key === "Escape") setEditing(false);
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-circular-bold text-[var(--color-text)] outline-none"
              aria-label="Precio unitario editable"
            />
          </div>
          <button
            type="button"
            onClick={apply}
            className="grid size-11 place-items-center rounded-[12px] bg-[var(--color-primary)] text-white"
            aria-label="Aplicar precio manual"
          >
            <CheckIcon size={15} weight="bold" />
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="px-2 pt-1 text-[10px] font-circular-bold text-red-600">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}

function PriceOption({
  label,
  description,
  price,
  active,
  dotClassName,
  onClick,
}: {
  label: string;
  description: string;
  price: number;
  active: boolean;
  dotClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-[104px] rounded-[12px] bg-[var(--color-input-bg)] p-3 text-left transition-all hover:bg-[var(--color-button-hover)]",
        active && "ring-2 ring-[var(--color-primary)]",
      )}
    >
      {active ? (
        <CheckCircleIcon
          size={18}
          weight="fill"
          className="absolute right-2 top-2 text-[var(--color-primary)]"
        />
      ) : null}
      <span className={`mb-2 block size-2 rounded-full ${dotClassName}`} />
      <span className="block pr-4">
        <span className="block text-[11px] font-circular-bold text-[var(--color-muted-foreground)]">
          {label}
        </span>
        <span className="mt-1 block text-base font-circular-bold text-[var(--color-text)]">
          S/{price.toFixed(2)}
        </span>
        <span className="mt-1 block text-[10px] text-[var(--color-muted-foreground)]">
          {description}
        </span>
      </span>
    </button>
  );
}
