export interface SeedKeywordItem {
  categoryId: string;
  keyword: string;
  language: "en" | "fil" | "es" | "any";
}

export const DEFAULT_CATEGORY_SEED_KEYWORDS: SeedKeywordItem[] = [
  // --- Housing ---
  { categoryId: "cat_sub_housing_rent", keyword: "rent", language: "en" },
  { categoryId: "cat_sub_housing_rent", keyword: "mortgage", language: "en" },
  { categoryId: "cat_sub_housing_rent", keyword: "upa", language: "fil" },
  { categoryId: "cat_sub_housing_rent", keyword: "renta", language: "fil" },
  { categoryId: "cat_sub_housing_rent", keyword: "alquiler", language: "es" },
  { categoryId: "cat_sub_housing_rent", keyword: "hipoteca", language: "es" },
  { categoryId: "cat_sub_housing_rent", keyword: "pag-ibig housing", language: "fil" },
  { categoryId: "cat_sub_housing_rent", keyword: "apartment", language: "en" },

  { categoryId: "cat_sub_housing_maintenance", keyword: "repair", language: "en" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "plumber", language: "en" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "plumbing", language: "en" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "electrician", language: "en" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "karpintero", language: "fil" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "pintura", language: "fil" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "hardware", language: "en" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "home depot", language: "any" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "ace hardware", language: "any" },
  { categoryId: "cat_sub_housing_maintenance", keyword: "handyman", language: "en" },

  { categoryId: "cat_sub_housing_supplies", keyword: "detergent", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "dish soap", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "bleach", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "mop", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "walis", language: "fil" },
  { categoryId: "cat_sub_housing_supplies", keyword: "cleaning supplies", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "toilet paper", language: "en" },
  { categoryId: "cat_sub_housing_supplies", keyword: "trash bag", language: "en" },

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
  { categoryId: "cat_sub_food_coffee", keyword: "pickup coffee", language: "any" },

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
  { categoryId: "cat_sub_food_restaurants", keyword: "grabfood", language: "any" },
  { categoryId: "cat_sub_food_restaurants", keyword: "foodpanda", language: "any" },

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
  { categoryId: "cat_sub_food_groceries", keyword: "sm supermarket", language: "any" },
  { categoryId: "cat_sub_food_groceries", keyword: "robinsons supermarket", language: "any" },
  { categoryId: "cat_sub_food_groceries", keyword: "dali", language: "any" },

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
  { categoryId: "cat_sub_transport_parking", keyword: "easytrip", language: "any" },
  { categoryId: "cat_sub_transport_parking", keyword: "autosweep", language: "any" },

  // Car Maintenance
  { categoryId: "cat_sub_transport_maintenance", keyword: "car wash", language: "en" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "oil change", language: "en" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "change oil", language: "en" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "vulcanizing", language: "any" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "gulong", language: "fil" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "tire", language: "en" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "mekaniko", language: "fil" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "auto repair", language: "en" },
  { categoryId: "cat_sub_transport_maintenance", keyword: "car repair", language: "en" },

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
  { categoryId: "cat_sub_util_internet", keyword: "prepaid load", language: "fil" },

  // --- Shopping ---
  { categoryId: "cat_sub_shop_clothes", keyword: "clothes", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "clothing", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "shoes", language: "en" },
  { categoryId: "cat_sub_shop_clothes", keyword: "damit", language: "fil" },
  { categoryId: "cat_sub_shop_clothes", keyword: "sapatos", language: "fil" },
  { categoryId: "cat_sub_shop_clothes", keyword: "ropa", language: "es" },
  { categoryId: "cat_sub_shop_clothes", keyword: "uniqlo", language: "any" },
  { categoryId: "cat_sub_shop_clothes", keyword: "zara", language: "any" },
  { categoryId: "cat_sub_shop_clothes", keyword: "h&m", language: "any" },

  { categoryId: "cat_sub_shop_tech", keyword: "gadget", language: "en" },
  { categoryId: "cat_sub_shop_tech", keyword: "electronics", language: "en" },
  { categoryId: "cat_sub_shop_tech", keyword: "laptop", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "phone", language: "en" },
  { categoryId: "cat_sub_shop_tech", keyword: "shopee", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "lazada", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "amazon", language: "any" },
  { categoryId: "cat_sub_shop_tech", keyword: "apple", language: "any" },

  { categoryId: "cat_sub_shop_household", keyword: "furniture", language: "en" },
  { categoryId: "cat_sub_shop_household", keyword: "bedsheet", language: "en" },
  { categoryId: "cat_sub_shop_household", keyword: "unan", language: "fil" },
  { categoryId: "cat_sub_shop_household", keyword: "kurtina", language: "fil" },
  { categoryId: "cat_sub_shop_household", keyword: "plato", language: "fil" },
  { categoryId: "cat_sub_shop_household", keyword: "baso", language: "fil" },
  { categoryId: "cat_sub_shop_household", keyword: "ikea", language: "any" },
  { categoryId: "cat_sub_shop_household", keyword: "appliances", language: "en" },

  // --- Health & Wellness ---
  { categoryId: "cat_sub_health_medical", keyword: "doctor", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "dentist", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "hospital", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "clinic", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "doktor", language: "fil" },
  { categoryId: "cat_sub_health_medical", keyword: "dentista", language: "fil" },
  { categoryId: "cat_sub_health_medical", keyword: "consultation", language: "en" },
  { categoryId: "cat_sub_health_medical", keyword: "médico", language: "es" },

  { categoryId: "cat_sub_health_pharmacy", keyword: "medicine", language: "en" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "pharmacy", language: "en" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "gamot", language: "fil" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "botika", language: "fil" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "farmacia", language: "es" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "watsons", language: "any" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "mercury drug", language: "fil" },
  { categoryId: "cat_sub_health_pharmacy", keyword: "generics pharmacy", language: "fil" },

  { categoryId: "cat_sub_health_insurance", keyword: "health insurance", language: "en" },
  { categoryId: "cat_sub_health_insurance", keyword: "hmo", language: "any" },
  { categoryId: "cat_sub_health_insurance", keyword: "philhealth", language: "fil" },
  { categoryId: "cat_sub_health_insurance", keyword: "maxicare", language: "any" },
  { categoryId: "cat_sub_health_insurance", keyword: "medicard", language: "any" },
  { categoryId: "cat_sub_health_insurance", keyword: "intellicare", language: "any" },
  { categoryId: "cat_sub_health_insurance", keyword: "life insurance", language: "en" },

  // --- Personal Care ---
  { categoryId: "cat_sub_personal_grooming", keyword: "haircut", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "barber", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "salon", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "gupit", language: "fil" },
  { categoryId: "cat_sub_personal_grooming", keyword: "peluquería", language: "es" },
  { categoryId: "cat_sub_personal_grooming", keyword: "spa", language: "any" },
  { categoryId: "cat_sub_personal_grooming", keyword: "massage", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "masahe", language: "fil" },
  { categoryId: "cat_sub_personal_grooming", keyword: "facial", language: "en" },
  { categoryId: "cat_sub_personal_grooming", keyword: "manicure", language: "any" },
  { categoryId: "cat_sub_personal_grooming", keyword: "pedicure", language: "any" },

  { categoryId: "cat_sub_personal_fitness", keyword: "gym", language: "any" },
  { categoryId: "cat_sub_personal_fitness", keyword: "fitness", language: "en" },
  { categoryId: "cat_sub_personal_fitness", keyword: "anytime fitness", language: "any" },
  { categoryId: "cat_sub_personal_fitness", keyword: "gold's gym", language: "any" },
  { categoryId: "cat_sub_personal_fitness", keyword: "supplements", language: "en" },
  { categoryId: "cat_sub_personal_fitness", keyword: "workout", language: "en" },

  // --- Entertainment ---
  { categoryId: "cat_sub_entertainment_events", keyword: "movie", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "cinema", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "sine", language: "fil" },
  { categoryId: "cat_sub_entertainment_events", keyword: "cine", language: "es" },
  { categoryId: "cat_sub_entertainment_events", keyword: "concert", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "ticket", language: "en" },
  { categoryId: "cat_sub_entertainment_events", keyword: "imax", language: "any" },

  { categoryId: "cat_sub_entertainment_hobbies", keyword: "steam", language: "any" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "playstation", language: "any" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "nintendo", language: "any" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "games", language: "en" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "toys", language: "en" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "billiard", language: "en" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "bowling", language: "en" },
  { categoryId: "cat_sub_entertainment_hobbies", keyword: "arcade", language: "any" },

  { categoryId: "cat_sub_entertainment_streaming", keyword: "netflix", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "spotify", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "disney+", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "youtube premium", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "hbo", language: "any" },
  { categoryId: "cat_sub_entertainment_streaming", keyword: "apple music", language: "any" },

  // --- Financial ---
  { categoryId: "cat_sub_financial_fees", keyword: "bank fee", language: "en" },
  { categoryId: "cat_sub_financial_fees", keyword: "atm fee", language: "en" },
  { categoryId: "cat_sub_financial_fees", keyword: "transfer fee", language: "en" },
  { categoryId: "cat_sub_financial_fees", keyword: "service charge", language: "en" },
  { categoryId: "cat_sub_financial_fees", keyword: "interbank fee", language: "en" },

  { categoryId: "cat_sub_financial_loans", keyword: "loan", language: "en" },
  { categoryId: "cat_sub_financial_loans", keyword: "utang", language: "fil" },
  { categoryId: "cat_sub_financial_loans", keyword: "amortisasyon", language: "fil" },
  { categoryId: "cat_sub_financial_loans", keyword: "credit card payment", language: "en" },
  { categoryId: "cat_sub_financial_loans", keyword: "home credit", language: "any" },
  { categoryId: "cat_sub_financial_loans", keyword: "installment", language: "en" },

  // --- Other Expenses ---
  { categoryId: "cat_exp_others", keyword: "misc", language: "en" },
  { categoryId: "cat_exp_others", keyword: "miscellaneous", language: "en" },
  { categoryId: "cat_exp_others", keyword: "others", language: "en" },
  { categoryId: "cat_exp_others", keyword: "gastos", language: "fil" },
  { categoryId: "cat_exp_others", keyword: "other expense", language: "en" },

  // --- Income ---
  // Salary
  { categoryId: "cat_sub_salary_base", keyword: "salary", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "paycheck", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "wages", language: "en" },
  { categoryId: "cat_sub_salary_base", keyword: "sahod", language: "fil" },
  { categoryId: "cat_sub_salary_base", keyword: "sweldo", language: "fil" },
  { categoryId: "cat_sub_salary_base", keyword: "sueldo", language: "es" },
  { categoryId: "cat_sub_salary_base", keyword: "salario", language: "es" },
  { categoryId: "cat_sub_salary_base", keyword: "nómina", language: "es" },

  { categoryId: "cat_sub_salary_bonus", keyword: "bonus", language: "any" },
  { categoryId: "cat_sub_salary_bonus", keyword: "commission", language: "en" },
  { categoryId: "cat_sub_salary_bonus", keyword: "13th month", language: "fil" },
  { categoryId: "cat_sub_salary_bonus", keyword: "incentive", language: "en" },
  { categoryId: "cat_sub_salary_bonus", keyword: "tip", language: "en" },

  // Freelance & Business
  { categoryId: "cat_sub_freelance_clients", keyword: "freelance", language: "any" },
  { categoryId: "cat_sub_freelance_clients", keyword: "client", language: "en" },
  { categoryId: "cat_sub_freelance_clients", keyword: "raket", language: "fil" },
  { categoryId: "cat_sub_freelance_clients", keyword: "upwork", language: "any" },
  { categoryId: "cat_sub_freelance_clients", keyword: "fiverr", language: "any" },
  { categoryId: "cat_sub_freelance_clients", keyword: "professional fee", language: "en" },

  { categoryId: "cat_sub_freelance_side_jobs", keyword: "side hustle", language: "en" },
  { categoryId: "cat_sub_freelance_side_jobs", keyword: "side job", language: "en" },
  { categoryId: "cat_sub_freelance_side_jobs", keyword: "sideline", language: "fil" },
  { categoryId: "cat_sub_freelance_side_jobs", keyword: "part time", language: "en" },
  { categoryId: "cat_sub_freelance_side_jobs", keyword: "extra income", language: "en" },

  // Investments
  { categoryId: "cat_sub_investments_dividends", keyword: "dividend", language: "en" },
  { categoryId: "cat_sub_investments_dividends", keyword: "dividends", language: "en" },
  { categoryId: "cat_sub_investments_dividends", keyword: "interest", language: "en" },
  { categoryId: "cat_sub_investments_dividends", keyword: "stock gain", language: "en" },
  { categoryId: "cat_sub_investments_dividends", keyword: "crypto gain", language: "any" },
  { categoryId: "cat_sub_investments_dividends", keyword: "yield", language: "en" },

  // Rental Income
  { categoryId: "cat_sub_rental_received", keyword: "rent income", language: "en" },
  { categoryId: "cat_sub_rental_received", keyword: "rental income", language: "en" },
  { categoryId: "cat_sub_rental_received", keyword: "paupa", language: "fil" },
  { categoryId: "cat_sub_rental_received", keyword: "rent received", language: "en" },
  { categoryId: "cat_sub_rental_received", keyword: "tenant", language: "en" },

  // Gifts
  { categoryId: "cat_inc_gifts", keyword: "gift", language: "en" },
  { categoryId: "cat_inc_gifts", keyword: "aguinaldo", language: "fil" },
  { categoryId: "cat_inc_gifts", keyword: "regalo", language: "fil" },
  { categoryId: "cat_inc_gifts", keyword: "pamasko", language: "fil" },
  { categoryId: "cat_inc_gifts", keyword: "ayuda", language: "fil" },
  { categoryId: "cat_inc_gifts", keyword: "donation", language: "en" },

  // Refunds
  { categoryId: "cat_sub_refunds_tax", keyword: "tax refund", language: "en" },
  { categoryId: "cat_sub_refunds_tax", keyword: "bir refund", language: "fil" },
  { categoryId: "cat_sub_refunds_tax", keyword: "tax return", language: "en" },

  { categoryId: "cat_sub_refunds_purchase", keyword: "refund", language: "en" },
  { categoryId: "cat_sub_refunds_purchase", keyword: "cashback", language: "any" },
  { categoryId: "cat_sub_refunds_purchase", keyword: "cash back", language: "any" },
  { categoryId: "cat_sub_refunds_purchase", keyword: "balik bayad", language: "fil" },
  { categoryId: "cat_sub_refunds_purchase", keyword: "reimbursement", language: "en" },

  // Other Income
  { categoryId: "cat_inc_others", keyword: "other income", language: "en" },
  { categoryId: "cat_inc_others", keyword: "extra money", language: "en" },
  { categoryId: "cat_inc_others", keyword: "iba pang kita", language: "fil" },
];
