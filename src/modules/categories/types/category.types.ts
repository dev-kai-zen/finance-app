import type { AppTheme } from "@/constants/theme";

export type CategoryType = "income" | "expense";

export type CategoricalColorKey = keyof AppTheme["colors"]["categorical"];

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}
