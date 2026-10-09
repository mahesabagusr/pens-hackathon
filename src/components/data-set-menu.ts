import type { IconName } from "./icon";

export const DATA_SET: {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  fresh?: boolean;
}[] = [
  {
    id: "decisions",
    label: "Decision log",
    icon: "book",
    href: "/dashboard/decisions",
  },
];
