import type { AppTheme } from "@/constants/theme";

export type CategoryType = "income" | "expense";

export type CategoricalColorKey = keyof AppTheme["colors"]["categorical"];

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  hexColorsId?: string | null;
  color: string | null;
  icon: string | null;
  parentId?: string | null;
  isSystem: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
  subcategories?: Category[];
}

export interface CategoryInput {
  name: string;
  type: CategoryType;
  hexColorsId?: string | null;
  color?: string;
  icon?: string;
  parentId?: string | null;
  sortOrder?: number;
}
