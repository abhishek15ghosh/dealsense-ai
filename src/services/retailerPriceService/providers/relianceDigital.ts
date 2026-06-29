import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class RelianceDigitalProvider implements RetailerPriceProvider {
  retailerName = 'Reliance Digital';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();

    try {
      // 1. Mock URL Intercept for local development/testing
      if (url.includes('mock-') || url.includes('/mock') || !url.startsWith('http')) {
        const mockPrices: Record<string, { title: string; price: number }> = {
          'iphone-15-pro': { title: 'Apple iPhone 15 (128GB, Black)', price: 58990 },
          'mock-iphone15': { title: 'Apple iPhone 15 (Black, 128 GB)', price: 65499 },
          'mock-macbookm3': { title: 'Apple MacBook Air M3 (13.6-inch, 8GB RAM, 256GB SSD)', price: 103990 },
          'mock-sonywh5': { title: 'Sony WH-1000XM5 Bluetooth Headset with Active Noise Cancellation', price: 29490 },
          'mock-s24u': { title: 'SAMSUNG Galaxy S24 Ultra (Titanium Gray, 256 GB)', price: 123999 },
          'mock-sony-wf': { title: 'Sony WF-1000XM5 Wireless Noise Cancelling Earbuds', price: 19490 },
          'mock-ipad-m4': { title: 'Apple iPad Pro M4 (11-inch, 256GB, Wi-Fi)', price: 86900 }
        };

        let matched = { title: 'Mock Reliance Digital Product', price: 34999 };
        for (const [key, value] of Object.entries(mockPrices)) {
          if (url.includes(key)) {
            matched = value;
            break;
          }
        }

        // Simulate dynamic price updates (+/- 2% fluctuation)
        const fluctuation = 0.98 + Math.random() * 0.04;
        const finalPrice = Math.round(matched.price * fluctuation);

        return {
          title: matched.title,
          price: finalPrice,
          retailer: this.retailerName,
          productUrl: url,
          success: true,
          timestamp
        };
      }

      // 2. Real Scraper Implementation
      console.log(`[Scraper] Fetching real Reliance Digital URL: ${url}`);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch Reliance Digital page: HTTP status ${res.status}`);
      }

      const html = await res.text();

      // Check for Cloudflare/CAPTCHA blockades
      if (html.includes('Access Denied') || html.includes('captcha') || html.includes('reCAPTCHA') || html.includes('Cloudflare')) {
        throw new Error('Blocked by Reliance Digital access controls or Cloudflare protection.');
      }

      // Extract Title
      const titleMatch = html.match(/<h1[^>]*class=["'][^"']*pdp__title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                         html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      let title = '';
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extract Price
      let price = 0;
      const patterns = [
        /<span[^>]*class=["'][^"']*pdp__offerPrice[^"']*["'][^>]*>[^\d]*([\d,]+)/i,
        /<span[^>]*class=["'][^"']*pdp__price[^"']*["'][^>]*>[^\d]*([\d,]+)/i,
        /<span[^>]*class=["'][^"']*price[^"']*["'][^>]*>[^\d]*([\d,]+)/i
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const cleanPrice = match[1].replace(/,/g, '');
          const val = parseFloat(cleanPrice);
          if (val > 0) {
            price = val;
            break;
          }
        }
      }

      if (!title || !price) {
        throw new Error('Scraper could not locate title or price selectors in Reliance Digital HTML response.');
      }

      return {
        title,
        price,
        retailer: this.retailerName,
        productUrl: url,
        success: true,
        timestamp
      };

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Scraper Error] Failed to scrape Reliance Digital URL: ${url}. Error: ${errMsg}`);
      return {
        title: 'Unknown Reliance Digital Product',
        price: 0,
        retailer: this.retailerName,
        productUrl: url,
        success: false,
        error: errMsg,
        timestamp
      };
    }
  }
}
