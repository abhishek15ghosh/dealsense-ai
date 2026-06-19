export interface CatalogItem {
  slug: string;
  title: string;
  brand: string;
  category: string;
  image: string;
  msrp: number;
  description: string;
  rating: number;
  reviewsCount: number;
}

export const CATALOG: CatalogItem[] = [
  {
    slug: 'iphone-15-pro',
    title: 'Apple iPhone 15 Pro (128GB, Natural Titanium)',
    brand: 'Apple',
    category: 'Smartphones',
    image: '/images/iphone15pro.png',
    msrp: 134900,
    description: 'Experience the titanium design, A17 Pro chip, custom Action button, and a powerful 48MP camera system. Features Super Retina XDR display with ProMotion and advanced camera capabilities.',
    rating: 4.7,
    reviewsCount: 1420
  },
  {
    slug: 'macbook-air-m3',
    title: 'Apple MacBook Air M3 (13.6-inch, 8GB RAM, 256GB SSD)',
    brand: 'Apple',
    category: 'Laptops',
    image: '/images/macbookair.png',
    msrp: 114900,
    description: 'The M3 chip brings even greater capabilities to the superportable 13-inch MacBook Air. With up to 18 hours of battery life and a gorgeous Liquid Retina display, you can take it anywhere.',
    rating: 4.8,
    reviewsCount: 840
  },
  {
    slug: 'sony-wh-1000xm5',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    brand: 'Sony',
    category: 'Audio',
    image: '/images/sonyheadphones.png',
    msrp: 34990,
    description: 'The WH-1000XM5 headphones rewrite the rules for distraction-free listening. Two processors control 8 microphones for unprecedented noise cancelling and exceptional call quality.',
    rating: 4.6,
    reviewsCount: 3120
  },
  {
    slug: 'samsung-galaxy-s24-ultra',
    title: 'Samsung Galaxy S24 Ultra (256GB, Titanium Gray)',
    brand: 'Samsung',
    category: 'Smartphones',
    image: '/images/samsunggalaxy.png',
    msrp: 139999,
    description: 'Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity and possibility. Equipped with a 200MP camera and built-in S Pen.',
    rating: 4.8,
    reviewsCount: 980
  },
  {
    slug: 'ipad-pro-m4',
    title: 'Apple iPad Pro M4 (11-inch, 256GB, Wi-Fi)',
    brand: 'Apple',
    category: 'Tablets',
    image: '/images/macbookair.png',
    msrp: 99900,
    description: 'The thinnest Apple product ever features the outrageously powerful M4 chip, a breakthrough Ultra Retina XDR display, and superfast Wi-Fi 6E.',
    rating: 4.9,
    reviewsCount: 340
  },
  {
    slug: 'sony-wf-1000xm5',
    title: 'Sony WF-1000XM5 Wireless Noise Cancelling Earbuds',
    brand: 'Sony',
    category: 'Audio',
    image: '/images/sonyheadphones.png',
    msrp: 23990,
    description: 'The WF-1000XM5 features cutting-edge technology to deliver premium sound quality and the best truly wireless noise-canceling performance on the market.',
    rating: 4.5,
    reviewsCount: 710
  },
  {
    slug: 'oneplus-12',
    title: 'OnePlus 12 (512GB, Silky Black)',
    brand: 'OnePlus',
    category: 'Smartphones',
    image: '/images/samsunggalaxy.png',
    msrp: 69999,
    description: 'Redefined flagship smartphone specs with Snapdragon 8 Gen 3, 16GB RAM, 50MP Hasselblad camera, and 100W SUPERVOOC charging.',
    rating: 4.6,
    reviewsCount: 512
  },
  {
    slug: 'dell-xps-13',
    title: 'Dell XPS 13 Laptop (Intel Core Ultra 7, 16GB, 512GB SSD)',
    brand: 'Dell',
    category: 'Laptops',
    image: '/images/macbookair.png',
    msrp: 144990,
    description: 'Machined aluminum and glass palm rest make this our most elegant laptop yet. Built with Intel Core Ultra processors and advanced Intel Arc graphics.',
    rating: 4.4,
    reviewsCount: 290
  }
];

export function searchCatalog(query: string): CatalogItem[] {
  if (!query.trim()) return CATALOG;
  const q = query.toLowerCase();
  return CATALOG.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
  );
}
