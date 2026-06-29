export interface StorePrice {
  storeName: 'Amazon' | 'Flipkart' | 'Croma' | 'Reliance Digital';
  price: number;
  originalPrice: number;
  url: string;
  inStock: boolean;
  deliveryDays: number;
}

export interface PriceHistoryPoint {
  date: string;
  Amazon: number;
  Flipkart: number;
  Croma: number;
  'Reliance Digital': number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  reviewsCount: number;
  bestDealStore: 'Amazon' | 'Flipkart' | 'Croma' | 'Reliance Digital';
  bestDealPrice: number;
  prices: StorePrice[];
  priceHistory: PriceHistoryPoint[];
  aiRecommendation: {
    decision: 'STRONG BUY' | 'BUY NOW' | 'WAIT' | 'STRONG WAIT' | 'HIGH RISK' | 'STRONG_BUY' | 'BUY_NOW' | 'STRONG_WAIT' | 'HIGH_RISK' | 'AVOID';
    confidence: number; // 0 to 100
    reasoning: string[];
    summary: string;
    expectedBetterPriceRange?: string;
    bestPlatform?: string;
    estimatedSavings?: number;
    bestExpectedPurchaseDate?: string;
  };
}

export const mockProducts: Product[] = [
  {
    id: 'iphone-15-pro',
    name: 'Apple iPhone 15 (128GB, Black)',
    description: 'Experience the gorgeous color-infused glass design, A16 Bionic chip, custom Action button, and a powerful 48MP camera system. Features Super Retina XDR display with ProMotion and advanced camera capabilities.',
    image: '/images/iphone15pro.png',
    category: 'Smartphones',
    rating: 4.7,
    reviewsCount: 1420,
    bestDealStore: 'Reliance Digital',
    bestDealPrice: 58990,
    prices: [
      {
        storeName: 'Amazon',
        price: 65900,
        originalPrice: 79900,
        url: 'https://www.amazon.in/dp/B0CHX2WQLX',
        inStock: true,
        deliveryDays: 1,
      },
      {
        storeName: 'Flipkart',
        price: 59400,
        originalPrice: 79900,
        url: 'https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm2d83c9c7b11d1',
        inStock: true,
        deliveryDays: 2,
      },
      {
        storeName: 'Croma',
        price: 61900,
        originalPrice: 79900,
        url: 'https://www.croma.com/apple-iphone-15-128gb-black-/p/300652',
        inStock: true,
        deliveryDays: 3,
      },
      {
        storeName: 'Reliance Digital',
        price: 58990,
        originalPrice: 79900,
        url: 'https://www.reliancedigital.in/product/apple-iphone-15-128gb-black-lmiqm4-7533780',
        inStock: false,
        deliveryDays: 5,
      },
    ],
    priceHistory: [
      { date: 'May 20', Amazon: 69900, Flipkart: 68900, Croma: 70900, 'Reliance Digital': 69900 },
      { date: 'May 25', Amazon: 69900, Flipkart: 67500, Croma: 70900, 'Reliance Digital': 68900 },
      { date: 'May 30', Amazon: 68000, Flipkart: 66900, Croma: 70900, 'Reliance Digital': 68900 },
      { date: 'Jun 04', Amazon: 66900, Flipkart: 65000, Croma: 69900, 'Reliance Digital': 67900 },
      { date: 'Jun 09', Amazon: 65900, Flipkart: 64900, Croma: 68000, 'Reliance Digital': 66900 },
      { date: 'Jun 14', Amazon: 65900, Flipkart: 63500, Croma: 67900, 'Reliance Digital': 65900 },
      { date: 'Jun 19', Amazon: 65900, Flipkart: 59400, Croma: 61900, 'Reliance Digital': 58990 },
    ],
    aiRecommendation: {
      decision: 'BUY NOW',
      confidence: 88,
      summary: 'Current price on Reliance Digital is at an all-time low. Excellent window to purchase.',
      reasoning: [
        'Reliance Digital is offering an additional instant discount making it ₹20,000 below launch price.',
        'Historic price charts indicate this is the lowest price in the last 60 days.',
        'Reliance Digital is currently out of stock, indicating high demand; inventory levels on other platforms are dwindling.'
      ]
    }
  },
  {
    id: 'macbook-air-m3',
    name: 'Apple MacBook Air M3 (13.6-inch, 8GB RAM, 256GB SSD)',
    description: 'The M3 chip brings even greater capabilities to the superportable 13-inch MacBook Air. With up to 18 hours of battery life and a gorgeous Liquid Retina display, you can take it anywhere.',
    image: '/images/macbookair.png',
    category: 'Laptops',
    rating: 4.8,
    reviewsCount: 840,
    bestDealStore: 'Amazon',
    bestDealPrice: 104900,
    prices: [
      {
        storeName: 'Amazon',
        price: 104900,
        originalPrice: 114900,
        url: 'https://www.amazon.in/dp/B0CX8Y4B4G',
        inStock: true,
        deliveryDays: 1,
      },
      {
        storeName: 'Flipkart',
        price: 109900,
        originalPrice: 114900,
        url: 'https://www.flipkart.com/apple-macbook-air-m3-8-gb-256-gb-ssd-macos-sonoma-mrym3hn-a/p/itmbb8c09a80e118',
        inStock: true,
        deliveryDays: 3,
      },
      {
        storeName: 'Croma',
        price: 107900,
        originalPrice: 114900,
        url: 'https://www.croma.com/apple-macbook-air-mryr3hn-a-m3-8gb-256gb-ssd-13-6-inch-macos-sonoma-space-grey-/p/305284',
        inStock: true,
        deliveryDays: 2,
      },
      {
        storeName: 'Reliance Digital',
        price: 108900,
        originalPrice: 114900,
        url: 'https://www.reliancedigital.in/apple-macbook-air-mryu3hn-a-m3-8-gb-256-gb-ssd-13-inch-retina-display-macos-sonoma-midnight/p/494352136',
        inStock: true,
        deliveryDays: 2,
      },
    ],
    priceHistory: [
      { date: 'May 20', Amazon: 112900, Flipkart: 113900, Croma: 112900, 'Reliance Digital': 113900 },
      { date: 'May 25', Amazon: 111900, Flipkart: 113500, Croma: 111900, 'Reliance Digital': 112900 },
      { date: 'May 30', Amazon: 109900, Flipkart: 112900, Croma: 110900, 'Reliance Digital': 111900 },
      { date: 'Jun 04', Amazon: 108900, Flipkart: 111900, Croma: 109900, 'Reliance Digital': 110900 },
      { date: 'Jun 09', Amazon: 106900, Flipkart: 109900, Croma: 108900, 'Reliance Digital': 109900 },
      { date: 'Jun 14', Amazon: 105900, Flipkart: 109900, Croma: 107900, 'Reliance Digital': 108900 },
      { date: 'Jun 19', Amazon: 104900, Flipkart: 109900, Croma: 107900, 'Reliance Digital': 108900 },
    ],
    aiRecommendation: {
      decision: 'BUY NOW',
      confidence: 94,
      summary: 'Amazon is leading with a steep discount. Highly recommended to buy if you need it now.',
      reasoning: [
        'Amazon price represents a 9% direct discount off MSRP.',
        'Stocks are abundant on Amazon with Next-Day Prime delivery available.',
        'Next-gen M4 models are at least 6 months away, ensuring current tech longevity.'
      ]
    }
  },
  {
    id: 'sony-wh-1000xm5',
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    description: 'The WH-1000XM5 headphones rewrite the rules for distraction-free listening. Two processors control 8 microphones for unprecedented noise cancelling and exceptional call quality.',
    image: '/images/sonyheadphones.png',
    category: 'Audio',
    rating: 4.6,
    reviewsCount: 3120,
    bestDealStore: 'Croma',
    bestDealPrice: 26999,
    prices: [
      {
        storeName: 'Amazon',
        price: 29990,
        originalPrice: 34990,
        url: 'https://www.amazon.in/dp/B0B1VQ6S42',
        inStock: true,
        deliveryDays: 2,
      },
      {
        storeName: 'Flipkart',
        price: 28999,
        originalPrice: 34990,
        url: 'https://www.flipkart.com/sony-wh-1000xm5-designed-adaptive-anc-30-hours-battery-life-bluetooth-wired-headset/p/itm549646b90f4d3',
        inStock: true,
        deliveryDays: 4,
      },
      {
        storeName: 'Croma',
        price: 26999,
        originalPrice: 34990,
        url: 'https://www.croma.com/sony-wh-1000xm5-bluetooth-headphone-with-mic-auto-noise-cancellation-optimizer-over-ear-black-/p/257321',
        inStock: true,
        deliveryDays: 2,
      },
      {
        storeName: 'Reliance Digital',
        price: 27999,
        originalPrice: 34990,
        url: 'https://www.reliancedigital.in/sony-wh-1000xm5-wireless-industry-leading-active-noise-cancelling-headphones-black/p/492850913',
        inStock: true,
        deliveryDays: 3,
      },
    ],
    priceHistory: [
      { date: 'May 20', Amazon: 29990, Flipkart: 29999, Croma: 29999, 'Reliance Digital': 29999 },
      { date: 'May 25', Amazon: 29990, Flipkart: 29500, Croma: 28999, 'Reliance Digital': 29500 },
      { date: 'May 30', Amazon: 29990, Flipkart: 28999, Croma: 28499, 'Reliance Digital': 28999 },
      { date: 'Jun 04', Amazon: 29990, Flipkart: 28999, Croma: 27999, 'Reliance Digital': 28499 },
      { date: 'Jun 09', Amazon: 29990, Flipkart: 28999, Croma: 27499, 'Reliance Digital': 27999 },
      { date: 'Jun 14', Amazon: 29990, Flipkart: 28999, Croma: 26999, 'Reliance Digital': 27999 },
      { date: 'Jun 19', Amazon: 29990, Flipkart: 28999, Croma: 26999, 'Reliance Digital': 27999 },
    ],
    aiRecommendation: {
      decision: 'BUY NOW',
      confidence: 90,
      summary: 'Croma is offering a superb local discount. Excellent deal value.',
      reasoning: [
        'Croma has slashed the price by ₹8,000, bringing it down to a very competitive price of ₹26,999.',
        'It beats Amazon by nearly ₹3,000.',
        'Strong recommendation to pick up from Croma stores or delivery.'
      ]
    }
  },
  {
    id: 'samsung-galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra (256GB, Titanium Gray)',
    description: 'Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity and possibility. Equipped with a 200MP camera and built-in S Pen.',
    image: '/images/samsunggalaxy.png',
    category: 'Smartphones',
    rating: 4.8,
    reviewsCount: 980,
    bestDealStore: 'Reliance Digital',
    bestDealPrice: 119999,
    prices: [
      {
        storeName: 'Amazon',
        price: 124999,
        originalPrice: 139999,
        url: 'https://www.amazon.in/dp/B0CS5Z4GD3',
        inStock: true,
        deliveryDays: 1,
      },
      {
        storeName: 'Flipkart',
        price: 123999,
        originalPrice: 139999,
        url: 'https://www.flipkart.com/samsung-galaxy-s24-ultra-5g-titanium-gray-256-gb/p/itmd71db8c10fa62',
        inStock: true,
        deliveryDays: 2,
      },
      {
        storeName: 'Croma',
        price: 121999,
        originalPrice: 139999,
        url: 'https://www.croma.com/samsung-galaxy-s24-ultra-5g-12gb-ram-256gb-titanium-gray-/p/303970',
        inStock: true,
        deliveryDays: 3,
      },
      {
        storeName: 'Reliance Digital',
        price: 119999,
        originalPrice: 139999,
        url: 'https://www.reliancedigital.in/samsung-galaxy-s24-ultra-5g-256-gb-12-gb-ram-titanium-gray-smartphone/p/494351659',
        inStock: true,
        deliveryDays: 1,
      },
    ],
    priceHistory: [
      { date: 'May 20', Amazon: 129999, Flipkart: 129999, Croma: 129999, 'Reliance Digital': 129999 },
      { date: 'May 25', Amazon: 129999, Flipkart: 128999, Croma: 127999, 'Reliance Digital': 127999 },
      { date: 'May 30', Amazon: 128999, Flipkart: 126999, Croma: 125999, 'Reliance Digital': 125999 },
      { date: 'Jun 04', Amazon: 127999, Flipkart: 125999, Croma: 124999, 'Reliance Digital': 124999 },
      { date: 'Jun 09', Amazon: 126999, Flipkart: 124999, Croma: 123999, 'Reliance Digital': 122999 },
      { date: 'Jun 14', Amazon: 125999, Flipkart: 123999, Croma: 122999, 'Reliance Digital': 120999 },
      { date: 'Jun 19', Amazon: 124999, Flipkart: 123999, Croma: 121999, 'Reliance Digital': 119999 },
    ],
    aiRecommendation: {
      decision: 'WAIT',
      confidence: 72,
      summary: 'Prices are on a steady decline. Waiting for another 1-2 weeks might yield better discounts.',
      reasoning: [
        'Price dropped by ₹2,000 this week alone on Reliance Digital.',
        'An upcoming holiday sales event is projected to slash flagship Android prices by another 3-5%.',
        'If you need it immediately, Reliance Digital at ₹119,999 is still a solid deal, but patience is advised.'
      ]
    }
  }
];
