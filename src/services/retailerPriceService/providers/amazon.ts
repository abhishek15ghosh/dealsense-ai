import { RetailerPriceProvider, ProviderProductInfo } from '../types';

export class AmazonProvider implements RetailerPriceProvider {
  retailerName = 'Amazon';

  async fetchPrice(url: string): Promise<ProviderProductInfo> {
    const timestamp = new Date();
    
    try {
      // 1. Mock URL Intercept
      if (url.includes('mock-') || url.includes('/mock') || !url.startsWith('http')) {
        if (process.env.NODE_ENV === 'production') {
          return {
            title: 'URL Mismatch Page',
            price: 0,
            retailer: this.retailerName,
            productUrl: url,
            success: false,
            error: 'URL model keywords mismatch',
            timestamp
          };
        }

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

      // URL validation check
      if (!url || typeof url !== 'string' || !url.startsWith('http') || !url.includes('amazon.')) {
        throw new Error('invalid URL');
      }

      // 2. Real Scraper Implementation
      console.log(`[Scraper] Fetching real Amazon URL: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let res;
      try {
        res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Accept-Encoding': 'gzip, deflate, br'
          },
          signal: controller.signal
        });
      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('timeout');
        }
        throw new Error('HTTP blocked');
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.status === 404) {
        throw new Error('product unavailable');
      }
      if (res.status === 403 || res.status === 503 || res.status === 429) {
        throw new Error('HTTP blocked');
      }
      if (!res.ok) {
        throw new Error('HTTP blocked');
      }

      const html = await res.text();

      if (html.includes('Looking for something') || html.includes('not a functioning page') || html.includes('Page Not Found')) {
        throw new Error('product unavailable');
      }

      if (html.includes('Captcha') || html.includes('captcha') || html.includes('Robot Verification') || html.includes('robot verification')) {
        throw new Error('captcha / bot block');
      }

      const pageTitle = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
      if (pageTitle.includes('Page Not Found') || pageTitle.includes('404')) {
        throw new Error('product unavailable');
      }
      if (pageTitle.includes('Amazon.in: Online Shopping') || pageTitle === 'Amazon Sign In') {
        throw new Error('redirect issue');
      }

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
        /<span[^>]*class=["'][^"']*a-color-price[^"']*["']/i
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

      if (!title) {
        throw new Error('selector failed');
      }
      if (!price) {
        throw new Error('price not found');
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
      const isRealPageFailure = errMsg === 'product unavailable' || errMsg === 'invalid URL' || errMsg === 'redirect issue';
      
      // Fallback mapping disabled to enforce live-scraped price proof only
      /*
      if (!isRealPageFailure) {
        const urlMapping: Record<string, { title: string; price: number }> = {
          'B0CHX2698D': { title: 'Apple iPhone 15 (128 GB) - Black', price: 64999 },
          'B0CX8Y4B4G': { title: 'Apple MacBook Air M3 (13-inch, 8GB, 256GB SSD) - Space Grey', price: 104900 },
          'B09XS7JWHH': { title: 'Sony WH-1000XM5 Wireless Noise Cancelling Over-Ear Headphones', price: 24989 },
          'B0CS5XW6TN': { title: 'Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB RAM, 256GB Storage)', price: 124999 },
          'B0CQPP73S8': { title: 'OnePlus 12 (Silky Black, 16GB RAM, 512GB Storage)', price: 69999 }
        };

        for (const [key, val] of Object.entries(urlMapping)) {
          if (url.includes(key)) {
            return {
              title: val.title,
              price: val.price,
              retailer: this.retailerName,
              productUrl: url,
              success: true,
              timestamp
            };
          }
        }
      }
      */

      const cleanErrMsg = ['invalid URL', 'HTTP blocked', 'timeout', 'selector failed', 'captcha / bot block', 'product unavailable', 'price not found', 'redirect issue'].includes(errMsg)
        ? errMsg
        : 'HTTP blocked';
      console.error(`[Scraper Error] Failed to scrape Amazon URL: ${url}. Error: ${cleanErrMsg}`);
      return {
        title: 'Unknown Amazon Product',
        price: 0,
        retailer: this.retailerName,
        productUrl: url,
        success: false,
        error: cleanErrMsg,
        timestamp
      };
    }
  }
}
