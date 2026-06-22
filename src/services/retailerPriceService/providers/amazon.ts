import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class AmazonProvider implements RetailerPriceProvider {
  retailerName = 'Amazon';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();
    
    try {
      // 1. Mock URL Intercept
      if (url.includes('mock-') || url.includes('/mock') || !url.startsWith('http')) {
        const mockPrices: Record<string, { title: string; price: number }> = {
          'mock-iphone15': { title: 'Apple iPhone 15 Pro (128GB, Natural Titanium)', price: 121410 },
          'mock-macbookm3': { title: 'Apple MacBook Air M3 (13.6-inch, 8GB RAM, 256GB SSD)', price: 106857 },
          'mock-sonywh5': { title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', price: 31841 },
          'mock-s24u': { title: 'Samsung Galaxy S24 Ultra (256GB, Titanium Gray)', price: 128799 },
          'mock-sony-wf': { title: 'Sony WF-1000XM5 Wireless Noise Cancelling Earbuds', price: 21831 },
          'mock-ipad-m4': { title: 'Apple iPad Pro M4 (11-inch, 256GB, Wi-Fi)', price: 89910 }
        };

        let matched = { title: 'Mock Amazon Product', price: 49999 };
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
      console.log(`[Scraper] Fetching real Amazon URL: ${url}`);
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch page: HTTP status ${res.status}`);
      }

      const html = await res.text();

      // Extract Title
      const titleMatch = html.match(/<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
      let title = '';
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extract Price
      let price = 0;
      const patterns = [
        /<span[^>]*class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d,]+)/i,
        /<span[^>]*id=["']priceblock_ourprice["'][^>]*>[^\d]*([\d,.]+)/i,
        /<span[^>]*id=["']priceblock_dealprice["'][^>]*>[^\d]*([\d,.]+)/i,
        /<span[^>]*class=["'][^"']*a-offscreen[^"']*["'][^>]*>[^\d]*([\d,.]+)/i
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
        if (html.includes('Captcha') || html.includes('captcha') || html.includes('Robot Verification')) {
          throw new Error('Blocked by Amazon CAPTCHA / Robot Verification protection.');
        }
        throw new Error('Scraper could not locate title or price selectors in HTML response.');
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
      console.error(`[Scraper Error] Failed to scrape Amazon URL: ${url}. Error: ${errMsg}`);
      return {
        title: 'Unknown Amazon Product',
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
