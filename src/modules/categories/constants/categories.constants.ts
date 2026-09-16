import type { CategoryInput } from "../types/category.types";

export const CATEGORY_COLOR_KEYS = [
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
  "orange",
  "amber",
  "slate",
] as const;

export const CATEGORY_DEFAULT_COLOR_IDS: Record<"expense" | "income", string> = {
  expense: "color_red",
  income: "color_green",
};

export const CATEGORY_ICONS = [
  { key: "utensils", label: "Dining" },
  { key: "shopping-cart", label: "Groceries" },
  { key: "zap", label: "Utilities" },
  { key: "car", label: "Transport" },
  { key: "tag", label: "Shopping" },
  { key: "heart-pulse", label: "Health" },
  { key: "film", label: "Entertainment" },
  { key: "wallet", label: "Salary" },
  { key: "briefcase", label: "Business" },
  { key: "trending-up", label: "Investment" },
  { key: "gift", label: "Gift" },
  { key: "more-horizontal", label: "Others" },
] as const;

export const PROTECTED_CATEGORY_IDS = [
  "cat_exp_others",
  "cat_inc_others",
] as const;

export function isProtectedCategoryId(id: string): boolean {
  return (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);
}

export const DEFAULT_SEED_CATEGORIES: (CategoryInput & { id: string; isSystem: boolean })[] = [
  // Expense groups
  { id: "cat_exp_housing", name: "Housing", type: "expense", color: "blue", icon: "home", isSystem: false },
  { id: "cat_exp_food", name: "Food & Dining", type: "expense", color: "orange", icon: "utensils", isSystem: false },
  { id: "cat_exp_transport", name: "Transportation", type: "expense", color: "red", icon: "car", isSystem: false },
  { id: "cat_exp_utilities", name: "Utilities & Bills", type: "expense", color: "amber", icon: "zap", isSystem: false },
  { id: "cat_exp_shopping", name: "Shopping", type: "expense", color: "pink", icon: "tag", isSystem: false },
  { id: "cat_exp_health", name: "Health & Wellness", type: "expense", color: "indigo", icon: "heart-pulse", isSystem: false },
  { id: "cat_exp_personal", name: "Personal Care", type: "expense", color: "purple", icon: "smile", isSystem: false },
  { id: "cat_exp_entertainment", name: "Entertainment", type: "expense", color: "teal", icon: "film", isSystem: false },
  { id: "cat_exp_financial", name: "Financial", type: "expense", color: "slate", icon: "wallet", isSystem: false },
  { id: "cat_exp_others", name: "Other Expenses", type: "expense", color: "slate", icon: "more-horizontal", isSystem: true },

  // Income groups
  { id: "cat_inc_salary", name: "Salary & Wages", type: "income", color: "green", icon: "wallet", isSystem: false },
  { id: "cat_inc_freelance", name: "Freelance & Business", type: "income", color: "teal", icon: "briefcase", isSystem: false },
  { id: "cat_inc_investments", name: "Investment Income", type: "income", color: "blue", icon: "trending-up", isSystem: false },
  { id: "cat_inc_rental", name: "Rental Income", type: "income", color: "purple", icon: "home", isSystem: false },
  { id: "cat_inc_gifts", name: "Gifts & Grants", type: "income", color: "amber", icon: "gift", isSystem: false },
  { id: "cat_inc_refunds", name: "Refunds & Reimbursements", type: "income", color: "pink", icon: "rotate-ccw", isSystem: false },
  { id: "cat_inc_others", name: "Other Income", type: "income", color: "slate", icon: "more-horizontal", isSystem: true },

  // Expense subcategories
  { id: "cat_sub_housing_rent", name: "Rent & Mortgage", type: "expense", color: "blue", icon: "home", parentId: "cat_exp_housing", isSystem: false },
  { id: "cat_sub_housing_maintenance", name: "Home Maintenance", type: "expense", color: "blue", icon: "wrench", parentId: "cat_exp_housing", isSystem: false },
  { id: "cat_sub_housing_supplies", name: "Home Supplies", type: "expense", color: "blue", icon: "shopping-cart", parentId: "cat_exp_housing", isSystem: false },
  { id: "cat_sub_food_groceries", name: "Groceries", type: "expense", color: "orange", icon: "shopping-cart", parentId: "cat_exp_food", isSystem: false },
  { id: "cat_sub_food_restaurants", name: "Restaurants & Dining Out", type: "expense", color: "orange", icon: "utensils", parentId: "cat_exp_food", isSystem: false },
  { id: "cat_sub_food_coffee", name: "Coffee & Cafes", type: "expense", color: "orange", icon: "utensils", parentId: "cat_exp_food", isSystem: false },
  { id: "cat_sub_transport_fuel", name: "Gas & Fuel", type: "expense", color: "red", icon: "car", parentId: "cat_exp_transport", isSystem: false },
  { id: "cat_sub_transport_transit", name: "Public Transit & Commute", type: "expense", color: "red", icon: "train", parentId: "cat_exp_transport", isSystem: false },
  { id: "cat_sub_transport_parking", name: "Parking & Tolls", type: "expense", color: "red", icon: "parking-circle", parentId: "cat_exp_transport", isSystem: false },
  { id: "cat_sub_transport_maintenance", name: "Car Maintenance", type: "expense", color: "red", icon: "wrench", parentId: "cat_exp_transport", isSystem: false },
  { id: "cat_sub_util_electric", name: "Electricity", type: "expense", color: "amber", icon: "zap", parentId: "cat_exp_utilities", isSystem: false },
  { id: "cat_sub_util_water", name: "Water & Sanitation", type: "expense", color: "amber", icon: "waves", parentId: "cat_exp_utilities", isSystem: false },
  { id: "cat_sub_util_internet", name: "Internet & Phone", type: "expense", color: "amber", icon: "wifi", parentId: "cat_exp_utilities", isSystem: false },
  { id: "cat_sub_shop_clothes", name: "Clothing & Apparel", type: "expense", color: "pink", icon: "tag", parentId: "cat_exp_shopping", isSystem: false },
  { id: "cat_sub_shop_tech", name: "Electronics & Gadgets", type: "expense", color: "pink", icon: "smartphone", parentId: "cat_exp_shopping", isSystem: false },
  { id: "cat_sub_shop_household", name: "Household Items", type: "expense", color: "pink", icon: "shopping-cart", parentId: "cat_exp_shopping", isSystem: false },
  { id: "cat_sub_health_medical", name: "Medical & Dental", type: "expense", color: "indigo", icon: "heart-pulse", parentId: "cat_exp_health", isSystem: false },
  { id: "cat_sub_health_pharmacy", name: "Pharmacy", type: "expense", color: "indigo", icon: "pills", parentId: "cat_exp_health", isSystem: false },
  { id: "cat_sub_health_insurance", name: "Health Insurance", type: "expense", color: "indigo", icon: "shield-check", parentId: "cat_exp_health", isSystem: false },
  { id: "cat_sub_personal_grooming", name: "Haircut & Grooming", type: "expense", color: "purple", icon: "scissors", parentId: "cat_exp_personal", isSystem: false },
  { id: "cat_sub_personal_fitness", name: "Fitness", type: "expense", color: "purple", icon: "dumbbell", parentId: "cat_exp_personal", isSystem: false },
  { id: "cat_sub_entertainment_events", name: "Movies & Events", type: "expense", color: "teal", icon: "film", parentId: "cat_exp_entertainment", isSystem: false },
  { id: "cat_sub_entertainment_hobbies", name: "Hobbies & Recreation", type: "expense", color: "teal", icon: "gamepad-2", parentId: "cat_exp_entertainment", isSystem: false },
  { id: "cat_sub_entertainment_streaming", name: "Streaming Services", type: "expense", color: "teal", icon: "tv", parentId: "cat_exp_entertainment", isSystem: false },
  { id: "cat_sub_financial_fees", name: "Bank Fees", type: "expense", color: "slate", icon: "landmark", parentId: "cat_exp_financial", isSystem: false },
  { id: "cat_sub_financial_loans", name: "Loan Payments", type: "expense", color: "slate", icon: "credit-card", parentId: "cat_exp_financial", isSystem: false },

  // Income subcategories
  { id: "cat_sub_salary_base", name: "Base Salary", type: "income", color: "green", icon: "wallet", parentId: "cat_inc_salary", isSystem: false },
  { id: "cat_sub_salary_bonus", name: "Bonuses & Commissions", type: "income", color: "green", icon: "gift", parentId: "cat_inc_salary", isSystem: false },
  { id: "cat_sub_freelance_clients", name: "Client Payments", type: "income", color: "teal", icon: "briefcase", parentId: "cat_inc_freelance", isSystem: false },
  { id: "cat_sub_freelance_side_jobs", name: "Side Jobs", type: "income", color: "teal", icon: "briefcase", parentId: "cat_inc_freelance", isSystem: false },
  { id: "cat_sub_investments_dividends", name: "Dividends & Interest", type: "income", color: "blue", icon: "trending-up", parentId: "cat_inc_investments", isSystem: false },
  { id: "cat_sub_rental_received", name: "Rent Received", type: "income", color: "purple", icon: "home", parentId: "cat_inc_rental", isSystem: false },
  { id: "cat_sub_refunds_tax", name: "Tax Refunds", type: "income", color: "pink", icon: "rotate-ccw", parentId: "cat_inc_refunds", isSystem: false },
  { id: "cat_sub_refunds_purchase", name: "Purchase Refunds", type: "income", color: "pink", icon: "rotate-ccw", parentId: "cat_inc_refunds", isSystem: false },
];
