import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const CategoriesScreen = deferComponent(
  () => require("./screens/categories-screen").CategoriesScreen,
  "CategoriesScreen",
) as typeof import("./screens/categories-screen").CategoriesScreen;

export const CategoryGroupModal = deferComponent(
  () => require("./components/category-group-modal").CategoryGroupModal,
  "CategoryGroupModal",
) as typeof import("./components/category-group-modal").CategoryGroupModal;

export const SubcategoryModal = deferComponent(
  () => require("./components/subcategory-modal").SubcategoryModal,
  "SubcategoryModal",
) as typeof import("./components/subcategory-modal").SubcategoryModal;

export const CategoryPickerModal = deferComponent(
  () => require("./components/category-picker-modal").CategoryPickerModal,
  "CategoryPickerModal",
) as typeof import("./components/category-picker-modal").CategoryPickerModal;

export const useCategories = deferFunction(
  () => require("./hooks/use-categories").useCategories,
) as typeof import("./hooks/use-categories").useCategories;

export const reorderCategories = deferFunction(
  () => require("./services/reorder-categories.service").reorderCategories,
) as typeof import("./services/reorder-categories.service").reorderCategories;

export const requireCategory = deferFunction(
  () => require("./services/category-rules").requireCategory,
) as typeof import("./services/category-rules").requireCategory;

export const getCategory = deferFunction(
  () => require("./services/category-rules").getCategory,
) as typeof import("./services/category-rules").getCategory;

export const clearCustomWorkspaceCategories = deferFunction(
  () =>
    require("./services/prepare-workspace-categories.service")
      .clearCustomWorkspaceCategories,
) as typeof import("./services/prepare-workspace-categories.service").clearCustomWorkspaceCategories;

export const prepareWorkspaceCategories = deferFunction(
  () =>
    require("./services/prepare-workspace-categories.service")
      .prepareWorkspaceCategories,
) as typeof import("./services/prepare-workspace-categories.service").prepareWorkspaceCategories;

export type { CategorySetup } from "./services/prepare-workspace-categories.service";
export type {
  Category,
  CategoryInput,
  CategoryType,
  CategoricalColorKey,
} from "./types/category.types";
export type { CategoryPickerModalProps } from "./components/category-picker-modal";
