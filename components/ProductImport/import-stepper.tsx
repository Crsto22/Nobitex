"use client";

import {
  CheckCircleIcon,
  EyeIcon,
  TableIcon,
  UploadSimpleIcon,
} from "@/lib/icons";

import type { ImportStep } from "@/components/ProductImport/types";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1 as ImportStep, label: "Subir archivo", icon: UploadSimpleIcon },
  { id: 2 as ImportStep, label: "Mapear columnas", icon: TableIcon },
  { id: 3 as ImportStep, label: "Vista previa", icon: EyeIcon },
  { id: 4 as ImportStep, label: "Resultado", icon: CheckCircleIcon },
];

type ImportStepperProps = {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
};

export function ImportStepper({
  currentStep,
  onStepClick,
}: ImportStepperProps) {
  return (
    <ol className="mt-7 flex items-start">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const canNavigate = isCompleted && onStepClick;
        const Icon = step.icon;

        return (
          <li
            key={step.id}
            className="flex flex-1 items-start last:flex-none"
          >
            <button
              type="button"
              onClick={() => canNavigate && onStepClick(step.id)}
              disabled={!canNavigate}
              className={cn(
                "flex w-[68px] shrink-0 flex-col items-center gap-2 sm:w-[128px]",
                canNavigate && "cursor-pointer",
                !canNavigate && "cursor-default",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isActive &&
                    "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_6px_16px_rgba(16,29,105,0.24)]",
                  isCompleted &&
                    "border-[var(--color-primary)] bg-[var(--color-card)] text-[var(--color-primary)]",
                  !isActive &&
                    !isCompleted &&
                    "border-transparent bg-[var(--color-input-bg)] text-[var(--color-muted-foreground)]",
                )}
              >
                <Icon
                  size={18}
                  weight={isActive || isCompleted ? "fill" : "regular"}
                />
              </span>
              <span
                className={cn(
                  "text-center text-[11px] leading-tight sm:text-xs",
                  isActive
                    ? "font-circular-bold text-[var(--color-text)]"
                    : "font-circular-regular text-[var(--color-muted-foreground)]",
                )}
              >
                {step.label}
              </span>
            </button>

            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1 mt-5 h-[2px] flex-1 rounded-full sm:mx-3",
                  step.id < currentStep
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-border)]",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
