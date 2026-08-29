import type { Icon } from "@phosphor-icons/react";
import {
  ChartBarIcon,
  BellIcon,
  CalendarBlankIcon,
  CashRegisterIcon,
  ClockUserIcon,
  CreditCardIcon,
  CubeIcon,
  FileTextIcon,
  GearSixIcon,
  IdentificationBadgeIcon,
  ListBulletsIcon,
  PackageIcon,
  PaletteIcon,
  PresentationChartIcon,
  ReceiptIcon,
  RulerIcon,
  ShieldCheckIcon,
  ShoppingBagOpenIcon,
  ShoppingCartIcon,
  SquaresFourIcon,
  TagIcon,
  TruckIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WrenchIcon,
  QrCodeIcon,
} from "@phosphor-icons/react/ssr";

export type SidebarModule = {
  key: string;
  label: string;
  icon: Icon;
  route: string;
  assignable?: boolean;
  ownerOnly?: boolean;
};

export type SidebarChild = SidebarModule & {
  active?: boolean;
};

export type SidebarSection = {
  label: string;
  key: string;
  icon: Icon;
  active?: boolean;
  direct?: boolean;
  route?: string;
  assignable?: boolean;
  ownerOnly?: boolean;
  children: SidebarChild[];
};

export const sidebarSections: SidebarSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: SquaresFourIcon,
    active: true,
    direct: true,
    route: "/dashboard",
    children: [],
  },
  {
    key: "operaciones",
    label: "Operaciones",
    icon: ShoppingCartIcon,
    children: [
      {
        key: "ventas-pos",
        label: "Ventas POS",
        icon: ShoppingCartIcon,
        route: "/ventas",
      },
      { key: "caja", label: "Caja", icon: ReceiptIcon, route: "/caja" },
      {
        key: "cotizaciones",
        label: "Cotizaciones",
        icon: FileTextIcon,
        route: "/cotizaciones",
      },
      {
        key: "entregas-pendientes",
        label: "Entregas pendientes",
        icon: TruckIcon,
        route: "/entregas-pendientes",
      },
      {
        key: "clientes",
        label: "Clientes",
        icon: UsersThreeIcon,
        route: "/clientes",
      },
    ],
  },
  {
    key: "historial",
    label: "Historial",
    icon: ReceiptIcon,
    children: [
      {
        key: "historial-ventas",
        label: "Historial de ventas",
        icon: ReceiptIcon,
        route: "/historial/ventas",
      },
      {
        key: "historial-cotizaciones",
        label: "Historial cotizaciones",
        icon: FileTextIcon,
        route: "/historial/cotizaciones",
      },
    ],
  },
  {
    key: "facturacion",
    label: "Facturacion",
    icon: FileTextIcon,
    children: [
      {
        key: "comprobantes",
        label: "Comprobantes",
        icon: ReceiptIcon,
        route: "/facturacion/comprobantes",
      },
      {
        key: "nota-credito",
        label: "Nota de credito",
        icon: FileTextIcon,
        route: "/facturacion/nota-credito",
      },
      {
        key: "series",
        label: "Series",
        icon: ListBulletsIcon,
        route: "/facturacion/series",
      },
    ],
  },
  {
    key: "gre",
    label: "GRE",
    icon: TruckIcon,
    children: [
      {
        key: "gre-remitente",
        label: "GRE Remitente",
        icon: TruckIcon,
        route: "/gre/remitente",
      },
      {
        key: "conductores",
        label: "Conductores",
        icon: UserCircleIcon,
        route: "/gre/conductores",
      },
    ],
  },
  {
    key: "catalogo",
    label: "Catalogo",
    icon: ListBulletsIcon,
    children: [
      {
        key: "productos",
        label: "Productos",
        icon: CubeIcon,
        route: "/catalogo/productos",
      },
      {
        key: "categorias",
        label: "Categorias",
        icon: PackageIcon,
        route: "/catalogo/categorias",
      },
      {
        key: "marcas",
        label: "Marcas",
        icon: TagIcon,
        route: "/catalogo/marcas",
      },
      {
        key: "tallas",
        label: "Tallas",
        icon: RulerIcon,
        route: "/catalogo/tallas",
      },
      {
        key: "colores",
        label: "Colores",
        icon: PaletteIcon,
        route: "/catalogo/colores",
      },
    ],
  },
  {
    key: "stock",
    label: "Stock",
    icon: PackageIcon,
    children: [
      {
        key: "stock-movimientos",
        label: "Movimientos",
        icon: ListBulletsIcon,
        route: "/stock/movimientos",
      },
      {
        key: "stock-traspasos",
        label: "Traspasos",
        icon: TruckIcon,
        route: "/stock/traspasos",
      },
      {
        key: "stock-kardex",
        label: "Kardex",
        icon: ListBulletsIcon,
        route: "/stock/kardex",
      },
    ],
  },
  {
    key: "compras",
    label: "Compras",
    icon: ShoppingBagOpenIcon,
    children: [
      {
        key: "compras-ordenes",
        label: "Ordenes",
        icon: ReceiptIcon,
        route: "/compras/ordenes",
      },
      {
        key: "compras-proveedores",
        label: "Proveedores",
        icon: UsersThreeIcon,
        route: "/compras/proveedores",
      },
    ],
  },
  {
    key: "administracion",
    label: "Administracion",
    icon: IdentificationBadgeIcon,
    children: [
      {
        key: "sucursales",
        label: "Sucursales",
        icon: IdentificationBadgeIcon,
        route: "/administracion/sucursales",
      },
      {
        key: "usuarios",
        label: "Usuarios",
        icon: WrenchIcon,
        route: "/administracion/usuarios",
      },
    ],
  },
  {
    key: "reportes",
    label: "Reportes",
    icon: PresentationChartIcon,
    children: [
      {
        key: "reportes-ventas",
        label: "Ventas",
        icon: ChartBarIcon,
        route: "/reportes/ventas",
      },
      {
        key: "reportes-productos",
        label: "Productos",
        icon: CubeIcon,
        route: "/reportes/productos",
      },
      {
        key: "reportes-clientes",
        label: "Clientes",
        icon: UsersThreeIcon,
        route: "/reportes/clientes",
      },
      {
        key: "reportes-usuarios",
        label: "Usuarios",
        icon: UserCircleIcon,
        route: "/reportes/usuarios",
      },
    ],
  },
  {
    key: "plan",
    label: "Plan y facturacion",
    icon: CreditCardIcon,
    direct: true,
    route: "/configuracion/plan",
    children: [],
    assignable: false,
    ownerOnly: true,
  },
  {
    key: "configuracion",
    label: "Configuracion",
    icon: GearSixIcon,
    children: [
      {
        key: "empresa",
        label: "Empresa",
        icon: GearSixIcon,
        route: "/configuracion/empresa",
      },
      {
        key: "metodos-pago",
        label: "Metodos de pago",
        icon: CreditCardIcon,
        route: "/configuracion/metodos-pago",
      },
      {
        key: "mi-cuenta",
        label: "Mi cuenta",
        icon: UserCircleIcon,
        route: "/configuracion/mi-cuenta",
      },
    ],
  },
];

export const attendanceSidebarSections: SidebarSection[] = [
  {
    key: "asistencias-dashboard",
    label: "Dashboard",
    icon: SquaresFourIcon,
    direct: true,
    route: "/asistencias/dashboard",
    children: [],
  },
  {
    key: "asistencias-personal",
    label: "Personal",
    icon: UsersThreeIcon,
    direct: true,
    route: "/asistencias/personal",
    children: [],
  },
  {
    key: "asistencias-marcajes",
    label: "Marcaciones",
    icon: ClockUserIcon,
    direct: true,
    route: "/asistencias/marcajes",
    children: [],
  },
  {
    key: "asistencias-historial-marcaciones",
    label: "Historial",
    icon: ListBulletsIcon,
    direct: true,
    route: "/asistencias/historial-marcaciones",
    children: [],
  },
  {
    key: "asistencias-turnos",
    label: "Turnos",
    icon: CalendarBlankIcon,
    direct: true,
    route: "/asistencias/turnos",
    children: [],
  },
  {
    key: "asistencias-puntos-qr",
    label: "Puntos QR",
    icon: QrCodeIcon,
    direct: true,
    route: "/asistencias/puntos-qr",
    children: [],
  },
  {
    key: "asistencias-reportes",
    label: "Reportes",
    icon: PresentationChartIcon,
    direct: true,
    route: "/asistencias/reportes",
    children: [],
  },
  {
    key: "asistencias-plan",
    label: "Plan y facturacion",
    icon: CreditCardIcon,
    direct: true,
    route: "/asistencias/plan",
    children: [],
    assignable: false,
    ownerOnly: true,
  },
  {
    key: "asistencias-configuracion",
    label: "Configuración",
    icon: GearSixIcon,
    direct: true,
    route: "/asistencias/configuracion",
    children: [],
  },
];

export const superAdminSidebarSections: SidebarSection[] = [
  {
    key: "superadmin-dashboard",
    label: "Dashboard",
    icon: SquaresFourIcon,
    direct: true,
    route: "/superadmin",
    children: [],
  },
  {
    key: "superadmin-empresas",
    label: "Empresas",
    icon: IdentificationBadgeIcon,
    children: [
      {
        key: "superadmin-directorio-empresas",
        label: "Directorio de empresas",
        icon: IdentificationBadgeIcon,
        route: "/superadmin/empresas",
      },
      {
        key: "superadmin-consumos",
        label: "Consumo y limites",
        icon: PresentationChartIcon,
        route: "/superadmin/empresas/consumos",
      },
    ],
  },
  {
    key: "superadmin-planes",
    label: "Planes y suscripciones",
    icon: CreditCardIcon,
    children: [
      {
        key: "superadmin-suscripciones",
        label: "Suscripciones",
        icon: CreditCardIcon,
        route: "/superadmin/suscripciones",
      },
      {
        key: "superadmin-catalogo-planes",
        label: "Catalogo de planes",
        icon: ListBulletsIcon,
        route: "/superadmin/planes",
      },
      {
        key: "superadmin-afiliados",
        label: "Afiliados",
        icon: UsersThreeIcon,
        route: "/superadmin/afiliados",
      },
    ],
  },
  {
    key: "superadmin-facturacion",
    label: "Facturacion",
    icon: ReceiptIcon,
    children: [
      {
        key: "superadmin-comprobantes",
        label: "Comprobantes",
        icon: ReceiptIcon,
        route: "/superadmin/facturacion/comprobantes",
      },
      {
        key: "superadmin-emisor",
        label: "Configuracion del emisor",
        icon: GearSixIcon,
        route: "/superadmin/facturacion/emisor",
      },
      {
        key: "superadmin-sunat-empresas",
        label: "SUNAT por empresa",
        icon: ShieldCheckIcon,
        route: "/superadmin/facturacion/sunat",
      },
      {
        key: "superadmin-series",
        label: "Series",
        icon: ListBulletsIcon,
        route: "/superadmin/facturacion/series",
      },
    ],
  },
  {
    key: "superadmin-administracion",
    label: "Administracion",
    icon: UsersThreeIcon,
    children: [
      {
        key: "superadmin-usuarios",
        label: "Usuarios",
        icon: UserCircleIcon,
        route: "/superadmin/administracion/usuarios",
      },
      {
        key: "superadmin-notificaciones",
        label: "Notificaciones",
        icon: BellIcon,
        route: "/superadmin/administracion/notificaciones",
      },
    ],
  },
  {
    key: "superadmin-auditoria",
    label: "Auditoria",
    icon: ListBulletsIcon,
    children: [
      {
        key: "superadmin-cambios-planes",
        label: "Cambios de planes",
        icon: CreditCardIcon,
        route: "/superadmin/auditoria/planes",
      },
      {
        key: "superadmin-actividad",
        label: "Actividad administrativa",
        icon: ListBulletsIcon,
        route: "/superadmin/auditoria/actividad",
      },
    ],
  },
  {
    key: "superadmin-mi-cuenta",
    label: "Mi cuenta",
    icon: UserCircleIcon,
    children: [
      {
        key: "superadmin-perfil",
        label: "Perfil",
        icon: UserCircleIcon,
        route: "/superadmin/mi-cuenta",
      },
      {
        key: "superadmin-seguridad",
        label: "Seguridad",
        icon: WrenchIcon,
        route: "/superadmin/mi-cuenta/seguridad",
      },
    ],
  },
];

export const workspaceOptions = [
  {
    key: "ventas",
    label: "Ventas",
    icon: CashRegisterIcon,
    route: "/dashboard",
  },
  {
    key: "asistencias",
    label: "Asistencias",
    icon: ClockUserIcon,
    route: "/asistencias/dashboard",
  },
] as const;

export type SidebarWorkspace = (typeof workspaceOptions)[number]["key"];

export const tenantSidebarSections = [
  ...sidebarSections,
  ...attendanceSidebarSections,
];

export const sidebarModules: SidebarModule[] = tenantSidebarSections.flatMap(
  (section) =>
    section.direct && section.route
      ? [
          {
            key: section.key,
            label: section.label,
            icon: section.icon,
            route: section.route,
            assignable: section.assignable,
            ownerOnly: section.ownerOnly,
          },
        ]
      : section.children,
);

export const assignableSidebarModules = sidebarModules.filter(
  (module) => module.assignable !== false,
);

export const warehouseAssignableModuleKeys = new Set([
  "productos",
  "categorias",
  "marcas",
  "tallas",
  "colores",
  "stock-movimientos",
  "stock-traspasos",
  "stock-kardex",
  "compras-ordenes",
  "compras-proveedores",
  "sucursales",
  "gre-remitente",
  "conductores",
  "mi-cuenta",
]);
