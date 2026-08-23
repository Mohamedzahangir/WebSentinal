import type { ProductRecord } from "@/types";

/** Deterministic PRNG so demo datasets are stable across restarts. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJECTIVES = [
  "Wireless", "Premium", "Ultra", "Compact", "Ergonomic", "Portable",
  "Smart", "Pro", "Classic", "Deluxe", "Essential", "Titanium",
];

const PRODUCTS = [
  "Noise-Cancelling Headphones", "Mechanical Keyboard", "4K Action Camera",
  "Fitness Smartwatch", "Bluetooth Speaker", "USB-C Hub", "Gaming Mouse",
  "Laptop Stand", "Webcam Cover Pro", "Phone Gimbal", "Espresso Machine",
  "Air Purifier", "Robot Vacuum", "Electric Kettle", "Desk Lamp",
  "Monitor Arm", "SSD Enclosure", "Trail Backpack", "Camping Tent",
  "Yoga Mat", "Dumbbell Set", "Coffee Grinder", "Blender Pro",
  "HDMI Cable 2.1", "Wireless Charger", "Power Bank 20K", "Tablet Stylus",
  "Microphone Kit", "Studio Monitor", "Graphics Tablet",
];

const AVAILABILITY = ["In Stock", "In Stock", "In Stock", "Low Stock", "Out of Stock", "Preorder"];

export function generateProducts(count: number, seed: number): ProductRecord[] {
  const rand = mulberry32(seed);
  const out: ProductRecord[] = [];
  for (let i = 0; i < count; i++) {
    const adj = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
    const name = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
    const price = Math.round((15 + rand() * 485) * 100) / 100;
    const discountRoll = rand();
    const discount =
      discountRoll < 0.45 ? null : Math.round((5 + rand() * 45));
    const availability = AVAILABILITY[Math.floor(rand() * AVAILABILITY.length)];
    out.push({
      product: `${adj} ${name}`,
      price,
      currency: "USD",
      availability,
      discount,
      rating: Math.round((3.4 + rand() * 1.6) * 10) / 10,
      url: `https://store.example.com/p/${i + 1}`,
    });
  }
  return out;
}
