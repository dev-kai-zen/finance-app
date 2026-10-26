export interface SeedKeywordItem {
  categoryId: string;
  keyword: string;
  language: "en" | "fil" | "es" | "any";
}

export const DEFAULT_CATEGORY_SEED_KEYWORDS: SeedKeywordItem[] = [
  // --- Food & Dining ---
  // Coffee & Cafes
  { categoryId: "cat_sub_food_coffee", keyword: "coffee", language: "en" },
  { categoryId: "cat_sub_food_coffee", keyword: "cafe", language: "en" },
  { categoryId: "cat_sub_food_coffee", keyword: "starbucks", language: "any" },
  { categoryId: "cat_sub_food_coffee", keyword: "kape", language: "fil" },
  { categoryId: "cat_sub_food_coffee", keyword: "café", language: "es" },
  { categoryId: "cat_sub_food_coffee", keyword: "espresso", language: "any" },
  { categoryId: "cat_sub_food_coffee", keyword: "latte", language: "any" },
  { categoryId: "cat_sub_food_coffee", keyword: "cappuccino", language: "any" },
  { categoryId: "cat_sub_food_coffee", keyword: "dunkin", language: "any" },
  { categoryId: "cat_sub_food_coffee", keyword: "tim hortons", language: "any" },

  // Restaurants & Dining Out
  { categoryId: "cat_sub_food_restaurants", keyword: "lunch", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "dinner", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "breakfast", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "brunch", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "snack", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "snacks", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "tanghalian", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "hapunan", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "almusal", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "merienda", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "meryenda", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "kain", language: "fil" },
  { categoryId: "cat_sub_food_restaurants", keyword: "almuerzo", language: "es" },
  { categoryId: "cat_sub_food_restaurants", keyword: "cena", language: "es" },
  { categoryId: "cat_sub_food_restaurants", keyword: "desayuno", language: "es" },
  { categoryId: "cat_sub_food_restaurants", keyword: "comida", language: "es" },
  { categoryId: "cat_sub_food_restaurants", keyword: "mcdonalds", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "mcdo", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "jollibee", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "kfc", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "chowking", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "mang inasal", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "burger", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "pizza", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "fastfood", language: "en" },
  { categoryId: "cat_sub_food_restaurants", keyword: "restaurant", language: "en" },

  // Groceries
  { categoryId: "cat_sub_food_groceries", keyword: "grocery", language: "en" },
  { categoryId: "cat_sub_food_groceries", keyword: "groceries", language: "en" },
  { categoryId: "cat_sub_food_groceries", keyword: "supermarket", language: "en" },
  { categoryId: "cat_sub_food_groceries", keyword: "palengke", language: "fil" },
  { categoryId: "cat_sub_food_groceries", keyword: "pamamalengke", language: "fil" },
  { categoryId: "cat_sub_food_groceries", keyword: "supermercado", language: "es" },
  { categoryId: "cat_sub_food_groceries", keyword: "puregold", language: "any" },
  { categoryId: "cat_sub_food_groceries", keyword: "walmart", language: "any" },
  { categoryId: "cat_sub_food_groceries", keyword: "costco", language: "any" },

  // --- Transportation ---
  // Gas & Fuel
  { categoryId: "cat_sub_transport_fuel", keyword: "gas", language: "en" },
  { categoryId: "cat_sub_transport_fuel", keyword: "fuel", language: "en" },
  { categoryId: "cat_sub_transport_fuel", keyword: "gasoline", language: "en" },
  { categoryId: "cat_sub_transport_fuel", keyword: "petrol", language: "en" },
  { categoryId: "cat_sub_transport_fuel", keyword: "gasolina", language: "fil" },
  { categoryId: "cat_sub_transport_fuel", keyword: "diesel", language: "any" },
  { categoryId: "cat_sub_transport_fuel", keyword: "krudo", language: "fil" },
  { categoryId: "cat_sub_transport_fuel", keyword: "shell", language: "any" },
  { categoryId: "cat_sub_transport_fuel", keyword: "petron", language: "any" },
  { categoryId: "cat_sub_transport_fuel", keyword: "caltex", language: "any" },
  { categoryId: "cat_sub_transport_fuel", keyword: "seaoil", language: "any" },

  // Public Transit
  { categoryId: "cat_sub_transport_transit", keyword: "taxi", language: "any" },
  { categoryId: "cat_sub_transport_transit", keyword: "grab", language: "any" },
  { categoryId: "cat_sub_transport_transit", keyword: "uber", language: "any" },
  { categoryId: "cat_sub_transport_transit", keyword: "bus", language: "any" },
  { categoryId: "cat_sub_transport_transit", keyword: "train", language: "en" },
  { categoryId: "cat_sub_transport_transit", keyword: "mrt", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "lrt", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "jeep", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "jeepney", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "pamasahe", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "pasahe", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "angkas", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "joyride", language: "fil" },
  { categoryId: "cat_sub_transport_transit", keyword: "pasaje", language: "es" },

  // Parking & Tolls
  { categoryId: "cat_sub_transport_parking", keyword: "toll", language: "en" },
  { categoryId: "cat_sub_transport_parking", keyword: "tollway", language: "en" },
  { categoryId: "cat_sub_transport_parking", keyword: "parking", language: "en" },
  { categoryId: "cat_sub_transport_parking", keyword: "peaje", language: "es" },
  { categoryId: "cat_sub_transport_parking", keyword: "estacionamiento", language: "es" },

  // --- Utilities & Bills ---
  // Electricity
  { categoryId: "cat_sub_util_electric", keyword: "electricity", language: "en" },
  { categoryId: "cat_sub_util_electric", keyword: "electric", language: "en" },
  { categoryId: "cat_sub_util_electric", keyword: "power bill", language: "en" },
  { categoryId: "cat_sub_util_electric", keyword: "kuryente", language: "fil" },
  { categoryId: "cat_sub_util_electric", keyword: "meralco", language: "fil" },
  { categoryId: "cat_sub_util_electric", keyword: "luz", language: "es" },

  // Water
  { categoryId: "cat_sub_util_water", keyword: "water bill", language: "en" },
  { categoryId: "cat_sub_util_water", keyword: "tubig", language: "fil" },
  { categoryId: "cat_sub_util_water", keyword: "maynilad", language: "fil" },
  { categoryId: "cat_sub_util_water", keyword: "manila water", language: "fil" },
  { categoryId: "cat_sub_util_water", keyword: "agua", language: "es" },

  // Internet & Phone
  { categoryId: "cat_sub_util_internet", keyword: "internet", language: "en" },
  { categoryId: "cat_sub_util_internet", keyword: "wifi", language: "any" },
  { categoryId: "cat_sub_util_internet", keyword: "broadband", language: "en" },
  { categoryId: "cat_sub_util_internet", keyword: "pldt", language: "fil" },
  { categoryId: "cat_sub_util_internet", keyword: "globe", language: "fil" },
  { categoryId: "cat_sub_util_internet", keyword: "smart", language: "fil" },
  { categoryId: "cat_sub_util_internet", keyword: "converge", language: "fil" },
  { categoryId: "cat_sub_util_internet", keyword: "load", language: "fil" },

  // --- Shopping ---
  { categoryId: "cat_sub_shop_clothes", keyword: "clothes", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "clothing", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "shoes", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "damit", language: "fil" },
  { categoryId: "cat_sub_shop_clothes", keyword: "sapatos", language: "fil" },
  { categoryId: "cat_sub_shop_clothes", keyword: "ropa", language: "es" },
  { categoryId: "cat_sub_shop_tech", keyword: "gadget", language: "en" },
  { categoryId: "cat_sub_shop_tech", keyword: "electronics", language: "en" },
  { categoryId: "cat_sub_shop_tech", keyword: "laptop", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "shopee", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "lazada", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "amazon", language: "any" },

  // --- Health ---
  { categoryId: "cat_sub_health_medical", keyword: "doctor", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "dentist", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "hospital", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "doktor", language: "fil" },
  { categoryId: "cat_sub_health_medical", keyword: "dentista", language: "fil" },
  { categoryId: "cat_sub_health_medical", keyword: "médico", language: "es" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "medicine", language: "en" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "pharmacy", language: "en" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "gamot", language: "fil" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "botika", language: "fil" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "farmacia", language: "es" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "watsons", language: "any" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "mercury drug", language: "fil" },

  // --- Entertainment ---
  { categoryId: "cat_sub_entertainment_events", keyword: "movie", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "cinema", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "sine", language: "fil" },
  { categoryId: "cat_sub_entertainment_events", keyword: "cine", language: "es" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "netflix", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "spotify", language: "any" },

  // --- Personal Care ---
  { categoryId: "cat_sub_personal_grooming", keyword: "haircut", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "barber", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "salon", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "gupit", language: "fil" },
  { categoryId: "cat_sub_personal_grooming", keyword: "peluquería", language: "es" },
  { categoryId: "cat_sub_personal_fitness", keyword: "gym", language: "any" },
  { categoryId: "cat_sub_personal_fitness", keyword: "fitness", language: "en" },

  // --- Income ---
  { categoryId: "cat_sub_salary_base", keyword: "salary", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "paycheck", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "wages", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "sahod", language: "fil" },
  { categoryId: "cat_sub_salary_base", keyword: "sweldo", language: "fil" },
  { categoryId: "cat_sub_salary_base", keyword: "sueldo", language: "es" },
  { categoryId: "cat_sub_salary_base", keyword: "salario", language: "es" },
  { categoryId: "cat_sub_salary_base", keyword: "nómina", language: "es" },
  { categoryId: "cat_sub_freelance_clients", keyword: "freelance", language: "any" },
  { categoryId: "cat_sub_freelance_clients", keyword: "raket", language: "fil" },
  { categoryId: "cat_sub_salary_bonus", keyword: "bonus", language: "any" },
  { categoryId: "cat_sub_salary_bonus", keyword: "commission", language: "en" },
];
