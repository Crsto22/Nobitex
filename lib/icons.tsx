"use client";

import type { ComponentType, ReactElement, SVGProps } from "react";
import {
  AddressCard,
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowSwapHorizontal,
  ArrowsRotate,
  ArrowUp,
  ArrowUpRight,
  Bag,
  BagShopping,
  Bank,
  Barcode,
  Bell,
  Box,
  Building,
  Buildings,
  Calendar,
  CalendarAdd,
  CalendarCheck,
  Calculator,
  CardPos,
  Cart,
  Camera,
  ChartBar,
  ChartLine,
  Check,
  CheckCircle,
  Checklist,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardText,
  Clock,
  CloudUpload,
  CodeFile,
  Copy,
  CreditCard,
  Crosshairs,
  Crown,
  Database,
  DollarCircle,
  Download,
  Edit,
  Envelope,
  EnvelopeOpen,
  Eye,
  EyeOff,
  File,
  FilePdf,
  FileText,
  FileUp,
  Filter,
  Floppy,
  Folder,
  Forbidden,
  Gauge,
  Grid,
  Hashtag,
  Hourglass,
  House,
  Image,
  InfoCircle,
  Key,
  Layers,
  Link,
  List,
  Loader,
  Location,
  Lock,
  LockKeyhole,
  LockOpen,
  Logout,
  Map as MapIcon,
  MapPoint,
  Minus,
  Mobile,
  Money,
  Moon,
  More,
  Nodes,
  Note,
  Notebook,
  Package,
  Palette,
  PaperPlane,
  Personalcard,
  Phone,
  Plus,
  Power,
  PresentionChart,
  Printer,
  Qr,
  Receipt,
  Refresh,
  RowHorizontal,
  RowVertical,
  Ruler,
  Scale,
  Scooter,
  Search,
  Settings,
  Share,
  ShieldCheck,
  Sidebar,
  SortV,
  SquareArrowRightUp,
  Star,
  Store,
  Sun,
  Tag,
  TerminalSquare,
  Ticket,
  Timer,
  Trash,
  TrendUp,
  TriangleWarning,
  Truck,
  Tuning,
  Upload,
  User,
  UserAdd,
  UserCheck,
  UserCircle,
  Users,
  Users3,
  Verified,
  Wallet,
  Warehouse,
  Wifi,
  Widget,
  X,
  XCircle,
} from "reicon-react";
import {
  FacebookLogoIcon,
  GoogleLogoIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "./icon-brands";

export type IconWeight =
  | "thin"
  | "light"
  | "regular"
  | "bold"
  | "fill"
  | "duotone"
  | "Outline"
  | "Filled";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "color"> & {
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  weight?: IconWeight;
  strokeWidth?: number | string;
  className?: string;
};

type ReiconComponent = ComponentType<{
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  weight?: "Outline" | "Filled";
  strokeWidth?: number | string;
  className?: string;
}>;

function resolveWeight(weight?: IconWeight, strokeWidth?: number | string) {
  if (weight === "fill" || weight === "Filled") {
    return { weight: "Filled" as const, strokeWidth };
  }
  if (strokeWidth != null) {
    return { weight: "Outline" as const, strokeWidth };
  }
  switch (weight) {
    case "bold":
      return { weight: "Outline" as const, strokeWidth: 2.25 };
    case "light":
      return { weight: "Outline" as const, strokeWidth: 1 };
    case "thin":
      return { weight: "Outline" as const, strokeWidth: 0.75 };
    case "duotone":
      return { weight: "Outline" as const, strokeWidth: 1.75 };
    default:
      return { weight: "Outline" as const };
  }
}

function create(Comp: ReiconComponent): Icon {
  function Icon({ weight, strokeWidth, size = "1em", ...rest }: IconProps) {
    return (
      <Comp size={size} {...rest} {...resolveWeight(weight, strokeWidth)} />
    );
  }
  return Icon;
}

export type Icon = (props: IconProps) => ReactElement;

export const ArchiveIcon = create(Archive);
export const ArrowClockwiseIcon = create(Refresh);
export const ArrowDownIcon = create(ArrowDown);
export const ArrowLeftIcon = create(ArrowLeft);
export const ArrowRightIcon = create(ArrowRight);
export const ArrowsClockwiseIcon = create(ArrowsRotate);
export const ArrowsDownUpIcon = create(SortV);
export const ArrowsLeftRightIcon = create(ArrowSwapHorizontal);
export const ArrowSquareOutIcon = create(SquareArrowRightUp);
export const ArrowUpIcon = create(ArrowUp);
export const ArrowUpRightIcon = create(ArrowUpRight);
export const BagIcon = create(Bag);
export const BankIcon = create(Bank);
export const BarcodeIcon = create(Barcode);
export const BellIcon = create(Bell);
export const BuildingIcon = create(Building);
export const BuildingsIcon = create(Buildings);
export const CalculatorIcon = create(Calculator);
export const CalendarBlankIcon = create(Calendar);
export const CalendarCheckIcon = create(CalendarCheck);
export const CalendarIcon = create(Calendar);
export const CalendarPlusIcon = create(CalendarAdd);
export const CameraIcon = create(Camera);
export const CaretDownIcon = create(ChevronDown);
export const CaretLeftIcon = create(ChevronLeft);
export const CaretRightIcon = create(ChevronRight);
export const CashRegisterIcon = create(CardPos);
export const ChartBarIcon = create(ChartBar);
export const ChartLineUpIcon = create(ChartLine);
export const CheckCircleIcon = create(CheckCircle);
export const CheckIcon = create(Check);
export const CheckSquareIcon = create(CheckSquare);
export const CirclesFourIcon = create(Widget);
export const ClipboardTextIcon = create(ClipboardText);
export const ClockCountdownIcon = create(Timer);
export const ClockIcon = create(Clock);
export const ClockUserIcon = create(Clock);
export const CloudArrowUpIcon = create(CloudUpload);
export const ColumnsIcon = create(RowVertical);
export const CopyIcon = create(Copy);
export const CreditCardIcon = create(CreditCard);
export const CrosshairIcon = create(Crosshairs);
export const CrownIcon = create(Crown);
export const CubeIcon = create(Box);
export const CurrencyCircleDollarIcon = create(DollarCircle);
export const DatabaseIcon = create(Database);
export const DeviceMobileIcon = create(Mobile);
export const DotsThreeVerticalIcon = create(More);
export const DownloadSimpleIcon = create(Download);
export const EnvelopeIcon = create(Envelope);
export const EnvelopeOpenIcon = create(EnvelopeOpen);
export const EnvelopeSimpleIcon = create(Envelope);
export const EyeIcon = create(Eye);
export const EyeSlashIcon = create(EyeOff);
export const FileArrowUpIcon = create(FileUp);
export const FileCodeIcon = create(CodeFile);
export const FileCsvIcon = create(File);
export const FilePdfIcon = create(FilePdf);
export const FileTextIcon = create(FileText);
export const FileXlsIcon = create(FileText);
export const FloppyDiskIcon = create(Floppy);
export const FolderSimpleIcon = create(Folder);
export const FunnelIcon = create(Filter);
export const GaugeIcon = create(Gauge);
export const GearSixIcon = create(Settings);
export const HashIcon = create(Hashtag);
export const HourglassMediumIcon = create(Hourglass);
export const HouseIcon = create(House);
export const IdentificationBadgeIcon = create(Personalcard);
export const IdentificationCardIcon = create(AddressCard);
export const ImageIcon = create(Image);
export const InfoIcon = create(InfoCircle);
export const KeyIcon = create(Key);
export const LinkIcon = create(Link);
export const LinkSimpleIcon = create(Link);
export const ListBulletsIcon = create(List);
export const ListChecksIcon = create(Checklist);
export const LockKeyIcon = create(LockKeyhole);
export const LockOpenIcon = create(LockOpen);
export const LockSimpleIcon = create(Lock);
export const MagnifyingGlassIcon = create(Search);
export const MapPinAreaIcon = create(MapPoint);
export const MapPinIcon = create(Location);
export const MapTrifoldIcon = create(MapIcon);
export const MinusIcon = create(Minus);
export const MoneyIcon = create(Money);
export const MoonIcon = create(Moon);
export const MotorcycleIcon = create(Scooter);
export const NotepadIcon = create(Notebook);
export const NotePencilIcon = create(Note);
export const PackageIcon = create(Package);
export const PaletteIcon = create(Palette);
export const PaperPlaneTiltIcon = create(PaperPlane);
export const PencilSimpleIcon = create(Edit);
export const PhoneIcon = create(Phone);
export const PlusIcon = create(Plus);
export const PowerIcon = create(Power);
export const PresentationChartIcon = create(PresentionChart);
export const PrinterIcon = create(Printer);
export const ProhibitIcon = create(Forbidden);
export const QrCodeIcon = create(Qr);
export const ReceiptIcon = create(Receipt);
export const RowsIcon = create(RowHorizontal);
export const RulerIcon = create(Ruler);
export const ScalesIcon = create(Scale);
export const SealCheckIcon = create(Verified);
export const ShareNetworkIcon = create(Share);
export const ShieldCheckIcon = create(ShieldCheck);
export const ShoppingBagOpenIcon = create(BagShopping);
export const ShoppingCartIcon = create(Cart);
export const ShoppingCartSimpleIcon = create(Cart);
export const SidebarIcon = create(Sidebar);
export const SignOutIcon = create(Logout);
export const SpinnerGapIcon = create(Loader);
export const SquaresFourIcon = create(Grid);
export const StackIcon = create(Layers);
export const StarIcon = create(Star);
export const StorefrontIcon = create(Store);
export const SunIcon = create(Sun);
export const TableIcon = create(Grid);
export const TagIcon = create(Tag);
export const TerminalWindowIcon = create(TerminalSquare);
export const TicketIcon = create(Ticket);
export const TrashIcon = create(Trash);
export const TrendUpIcon = create(TrendUp);
export const TruckIcon = create(Truck);
export const UploadSimpleIcon = create(Upload);
export const UserCheckIcon = create(UserCheck);
export const UserCircleIcon = create(UserCircle);
export const UserIcon = create(User);
export const UserPlusIcon = create(UserAdd);
export const UsersIcon = create(Users);
export const UsersThreeIcon = create(Users3);
export const WalletIcon = create(Wallet);
export const WarehouseIcon = create(Warehouse);
export const WarningCircleIcon = create(AlertCircle);
export const WarningIcon = create(TriangleWarning);
export const WarningOctagonIcon = create(AlertTriangle);
export const WebhooksLogoIcon = create(Nodes);
export const WifiHighIcon = create(Wifi);
export const WrenchIcon = create(Tuning);
export const XCircleIcon = create(XCircle);
export const XIcon = create(X);

export {
  FacebookLogoIcon,
  GoogleLogoIcon,
  InstagramLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
};
