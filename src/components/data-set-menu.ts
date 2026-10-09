import type { IconName } from "./icon";

export const DATA_SET: { id: string; label: string; icon: IconName; href?: string; fresh?: boolean }[] = [
  { id: "crm", label: "CRM", icon: "contacts", href: "/dashboard?dataset=crm" },
  { id: "email", label: "Email", icon: "mail", fresh: true },
  { id: "usage", label: "Product Usage", icon: "usage" },
  { id: "ticket", label: "Ticket", icon: "ticket" },
  { id: "billing", label: "Contract & Billing", icon: "wallet" },
  { id: "decisions", label: "Decision log", icon: "book", href: "/dashboard/decisions" },
];
