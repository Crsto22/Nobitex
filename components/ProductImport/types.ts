export type ImportStep = 1 | 2 | 3 | 4;

export type BranchOption = {
  id: string;
  nombre: string;
  esPrincipal?: boolean;
};

export type PreviewFilter = "all" | "error" | "warning";
