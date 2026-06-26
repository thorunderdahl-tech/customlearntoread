// A small built-in food database for quick logging. Values are per the listed
// unit. Users can also log fully custom foods.
export interface Food {
  name: string;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const FOODS: Food[] = [
  // proteins
  { name: "Chicken breast, cooked", unit: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Lean ground beef, cooked", unit: "100g", calories: 215, protein: 26, carbs: 0, fat: 12 },
  { name: "Salmon, cooked", unit: "100g", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Canned tuna in water", unit: "100g", calories: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Whole egg", unit: "egg", calories: 72, protein: 6.3, carbs: 0.4, fat: 5 },
  { name: "Egg white", unit: "white", calories: 17, protein: 3.6, carbs: 0.2, fat: 0 },
  { name: "Greek yogurt, nonfat", unit: "100g", calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: "Cottage cheese, low-fat", unit: "100g", calories: 72, protein: 12, carbs: 3, fat: 1 },
  { name: "Whey protein scoop", unit: "scoop", calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  { name: "Tofu, firm", unit: "100g", calories: 144, protein: 17, carbs: 3, fat: 9 },
  { name: "Tempeh", unit: "100g", calories: 192, protein: 20, carbs: 8, fat: 11 },
  { name: "Lentils, cooked", unit: "100g", calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  { name: "Black beans, cooked", unit: "100g", calories: 132, protein: 9, carbs: 24, fat: 0.5 },
  { name: "Shrimp, cooked", unit: "100g", calories: 99, protein: 24, carbs: 0, fat: 0.3 },

  // carbs
  { name: "White rice, cooked", unit: "100g", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Brown rice, cooked", unit: "100g", calories: 123, protein: 2.7, carbs: 26, fat: 1 },
  { name: "Oats, dry", unit: "40g", calories: 150, protein: 5, carbs: 27, fat: 3 },
  { name: "Sweet potato, cooked", unit: "100g", calories: 90, protein: 2, carbs: 21, fat: 0.1 },
  { name: "Potato, cooked", unit: "100g", calories: 87, protein: 2, carbs: 20, fat: 0.1 },
  { name: "Whole-wheat bread", unit: "slice", calories: 80, protein: 4, carbs: 14, fat: 1 },
  { name: "Pasta, cooked", unit: "100g", calories: 158, protein: 6, carbs: 31, fat: 0.9 },
  { name: "Banana", unit: "medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: "Apple", unit: "medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: "Blueberries", unit: "100g", calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { name: "Quinoa, cooked", unit: "100g", calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },

  // fats / dairy / misc
  { name: "Almonds", unit: "28g", calories: 164, protein: 6, carbs: 6, fat: 14 },
  { name: "Peanut butter", unit: "tbsp", calories: 94, protein: 4, carbs: 3, fat: 8 },
  { name: "Olive oil", unit: "tbsp", calories: 119, protein: 0, carbs: 0, fat: 14 },
  { name: "Avocado", unit: "half", calories: 120, protein: 1.5, carbs: 6, fat: 11 },
  { name: "Cheddar cheese", unit: "28g", calories: 113, protein: 7, carbs: 0.4, fat: 9 },
  { name: "Whole milk", unit: "cup", calories: 149, protein: 8, carbs: 12, fat: 8 },
  { name: "Skim milk", unit: "cup", calories: 83, protein: 8, carbs: 12, fat: 0.2 },
  { name: "Almond milk, unsweetened", unit: "cup", calories: 30, protein: 1, carbs: 1, fat: 2.5 },

  // veg
  { name: "Broccoli, cooked", unit: "100g", calories: 35, protein: 2.4, carbs: 7, fat: 0.4 },
  { name: "Spinach, raw", unit: "100g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: "Mixed salad greens", unit: "100g", calories: 17, protein: 1.4, carbs: 3, fat: 0.2 },

  // convenience
  { name: "Protein bar", unit: "bar", calories: 200, protein: 20, carbs: 22, fat: 7 },
  { name: "Olive oil drizzle (tsp)", unit: "tsp", calories: 40, protein: 0, carbs: 0, fat: 4.5 },
  { name: "Dark chocolate", unit: "28g", calories: 170, protein: 2, carbs: 13, fat: 12 },
];
