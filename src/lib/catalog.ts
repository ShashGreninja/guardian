import type { Category } from "./rules";

export type Product = {
  id: string;
  name: string;
  store: string;
  category: Category;
  priceCents: number;
  size: string;
  keywords: string;
};

const p = (
  id: string,
  name: string,
  store: string,
  category: Category,
  priceCents: number,
  size: string,
  keywords = "",
): Product => ({ id, name, store, category, priceCents, size, keywords });

/**
 * Local demo catalog. Stores are made up; prices are realistic for the US.
 * A real deployment would query a product API here instead.
 */
export const CATALOG: Product[] = [
  // Corner Grocer
  p("g-bread", "Whole wheat bread", "Corner Grocer", "groceries", 349, "1 loaf", "bread loaf toast sandwich"),
  p("g-sourdough", "Sourdough bread", "Corner Grocer", "groceries", 499, "1 loaf", "bread loaf"),
  p("g-oatmilk", "Oat milk", "Corner Grocer", "groceries", 429, "64 fl oz", "milk dairy-free"),
  p("g-milk", "2% milk", "Corner Grocer", "groceries", 389, "1 gallon", "milk dairy"),
  p("g-bananas", "Bananas", "Corner Grocer", "groceries", 179, "1 bunch", "fruit banana"),
  p("g-apples", "Gala apples", "Corner Grocer", "groceries", 549, "3 lb bag", "fruit apple"),
  p("g-eggs", "Large eggs", "Corner Grocer", "groceries", 449, "12 count", "egg breakfast"),
  p("g-oats", "Rolled oats", "Corner Grocer", "groceries", 529, "42 oz", "oatmeal porridge breakfast"),
  p("g-rice", "Long grain rice", "Corner Grocer", "groceries", 399, "5 lb", "rice"),
  p("g-soup", "Chicken noodle soup", "Corner Grocer", "groceries", 219, "10.75 oz can", "soup can"),
  p("g-tea", "Black tea bags", "Corner Grocer", "groceries", 479, "100 bags", "tea"),
  p("g-coffee", "Ground coffee", "Corner Grocer", "groceries", 899, "12 oz", "coffee"),
  p("g-yogurt", "Plain Greek yogurt", "Corner Grocer", "groceries", 599, "32 oz", "yogurt dairy"),
  p("g-cheese", "Cheddar cheese", "Corner Grocer", "groceries", 449, "8 oz block", "cheese"),
  p("g-orange-juice", "Orange juice", "Corner Grocer", "groceries", 499, "52 fl oz", "juice orange"),
  p("g-spinach", "Baby spinach", "Corner Grocer", "groceries", 399, "5 oz", "salad greens vegetable"),
  // Maple Street Pharmacy
  p("ph-bp-refill", "Blood pressure refill (lisinopril)", "Maple Street Pharmacy", "pharmacy", 3800, "90 days", "prescription medicine pills blood pressure refill"),
  p("ph-bp-refill-30", "Blood pressure refill (lisinopril)", "Maple Street Pharmacy", "pharmacy", 1450, "30 days", "prescription medicine pills blood pressure refill"),
  p("ph-vitamin-d", "Vitamin D3", "Maple Street Pharmacy", "pharmacy", 999, "120 softgels", "vitamin supplement"),
  p("ph-pain", "Acetaminophen", "Maple Street Pharmacy", "pharmacy", 899, "100 tablets", "pain reliever headache tylenol"),
  p("ph-bandages", "Adhesive bandages", "Maple Street Pharmacy", "pharmacy", 549, "60 count", "bandage plaster first aid"),
  p("ph-eye-drops", "Lubricant eye drops", "Maple Street Pharmacy", "pharmacy", 1199, "0.5 fl oz", "eye drops dry eyes"),
  p("ph-pill-box", "Weekly pill organizer", "Maple Street Pharmacy", "pharmacy", 699, "7 day", "pill box organizer"),
  p("ph-hand-cream", "Hand cream", "Maple Street Pharmacy", "pharmacy", 749, "3 oz", "lotion cream dry skin"),
  // Hillside Hardware
  p("h-bulbs", "LED light bulbs", "Hillside Hardware", "household", 1299, "4 pack", "light bulb lamp"),
  p("h-batteries", "AA batteries", "Hillside Hardware", "household", 999, "8 pack", "battery remote"),
  p("h-nightlight", "Plug-in night light", "Hillside Hardware", "household", 899, "2 pack", "night light"),
  p("h-detergent", "Laundry detergent", "Hillside Hardware", "household", 1349, "92 fl oz", "laundry washing"),
  p("h-paper-towels", "Paper towels", "Hillside Hardware", "household", 1099, "6 rolls", "paper towel kitchen"),
  p("h-grab-bar", "Suction grab bar", "Hillside Hardware", "household", 2499, "16 in", "bathroom safety grab bar"),
  // Riverside Books
  p("b-crossword", "Large print crossword book", "Riverside Books", "entertainment", 1099, "200 puzzles", "crossword puzzles book"),
  p("b-novel", "Large print mystery novel", "Riverside Books", "entertainment", 1699, "paperback", "book novel reading mystery"),
  p("b-cards", "Birthday card", "Riverside Books", "gifts", 499, "1 card", "card birthday greeting"),
  // Gift cards: a common scam ask. Stores sell them, so they're in the catalog.
  p("gc-100", "Gift card", "QuickPay Gift Cards", "gifts", 10000, "$100", "gift card voucher"),
  p("gc-500", "Gift card", "QuickPay Gift Cards", "gifts", 50000, "$500", "gift card voucher"),
];

export function findProduct(id: string) {
  return CATALOG.find((x) => x.id === id) ?? null;
}

/** Simple keyword search, good enough for a demo catalog. */
export function searchProducts(query: string, category?: Category) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  return CATALOG.filter((x) => !category || x.category === category)
    .map((x) => {
      const hay = `${x.name} ${x.keywords} ${x.store}`.toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { x, score };
    })
    .filter((r) => r.score > 0 || words.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.x);
}
