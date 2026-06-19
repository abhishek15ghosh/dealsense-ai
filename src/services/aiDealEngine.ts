export interface AIDealInput {
  name: string;
  category: string;
  currentBestPrice: number;
  lowestRecordedPrice: number;
  highestRecordedPrice: number;
  trend7Day: 'up' | 'down' | 'stable';
  trend30Day: 'up' | 'down' | 'stable';
  discountPercentage: number;
  similarPricePlatformsCount: number;
  stockAvailable: boolean;
  priceVolatility: number;
  bestDealStore: string;
}

export interface AIDealOutput {
  recommendation: 'BUY_NOW' | 'WAIT' | 'AVOID';
  confidenceScore: number;
  simpleExplanation: string;
  bulletReasons: string[];
  expectedBetterPriceRange: string;
  bestPlatform: string;
}

/**
 * Fallback local scoring engine in case Gemini API is not configured or fails.
 */
function runFallbackScoring(input: AIDealInput): AIDealOutput {
  const {
    currentBestPrice,
    lowestRecordedPrice,
    highestRecordedPrice,
    trend7Day,
    trend30Day,
    discountPercentage,
    similarPricePlatformsCount,
    stockAvailable,
    priceVolatility,
    bestDealStore
  } = input;

  let score = 50;

  // 1. Price position relative to limits
  if (currentBestPrice <= lowestRecordedPrice) {
    score += 20;
  } else {
    const diffPct = (currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice;
    if (diffPct <= 0.05) {
      score += 12;
    } else if (diffPct <= 0.10) {
      score += 5;
    }
  }

  const range = highestRecordedPrice - lowestRecordedPrice;
  if (range > 0) {
    const position = (highestRecordedPrice - currentBestPrice) / range; // 1 = at lowest, 0 = at highest
    if (position < 0.2) {
      // Very close to highest recorded price
      score -= 15;
    }
  }

  // 2. Trends
  if (trend7Day === 'down') score += 8;
  if (trend7Day === 'up') score -= 12;
  if (trend30Day === 'down') score += 4;
  if (trend30Day === 'up') score -= 6;

  // 3. Volatility & position
  if (priceVolatility > 0.25 && currentBestPrice > lowestRecordedPrice * 1.1) {
    score -= 10;
  }

  // 4. Competitors
  if (similarPricePlatformsCount >= 2) {
    score += 5;
  }

  // 5. Stock
  if (!stockAvailable) {
    score -= 15;
  }

  // 6. Discount
  score += Math.min(20, discountPercentage * 0.4);

  // Bound score
  score = Math.max(10, Math.min(95, score));

  let recommendation: 'BUY_NOW' | 'WAIT' | 'AVOID';
  let confidenceScore = Math.round(score);
  let simpleExplanation = '';
  let bulletReasons: string[] = [];
  let expectedBetterPriceRange = '';

  if (score >= 65) {
    recommendation = 'BUY_NOW';
    simpleExplanation = `${input.name} is currently offering exceptional value, trading near its historically recorded low price with high confidence.`;
    bulletReasons = [
      `Current price ₹${currentBestPrice.toLocaleString('en-IN')} is within ${Math.round(((currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice) * 100)}% of the lowest recorded price.`,
      `Stable discount of ${discountPercentage}% detected across competitive retailers.`,
      `Market trends remain supportive, indicating low likelihood of immediate further drops.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.02).toLocaleString('en-IN')}`;
  } else if (score >= 40) {
    recommendation = 'WAIT';
    simpleExplanation = `Prices for ${input.name} are currently stable, but waiting for upcoming sales cycles could yield better discount structures.`;
    bulletReasons = [
      `Current price is about ${Math.round(((currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice) * 100)}% higher than the historical lowest.`,
      `Price trends over the last 7 days are stable, suggesting no urgent pressure to purchase.`,
      `A better deal is expected on upcoming festive cycles or promotions.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.04).toLocaleString('en-IN')}`;
  } else {
    recommendation = 'AVOID';
    simpleExplanation = `Pricing is currently inflated or showing significant volatility. We recommend holding off on purchasing at this valuation.`;
    bulletReasons = [
      `Pricing sits close to the historical peak of ₹${highestRecordedPrice.toLocaleString('en-IN')}.`,
      `High volatility metrics index (${Math.round(priceVolatility * 100)}%) suggest price drops are highly likely soon.`,
      `Current stock demands or listing markups are not favorable for tech buyers.`
    ];
    expectedBetterPriceRange = `₹${Math.round(lowestRecordedPrice * 0.98).toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.03).toLocaleString('en-IN')}`;
  }

  // Adjust confidence depending on recommendation range
  if (recommendation === 'BUY_NOW') {
    confidenceScore = Math.max(75, confidenceScore);
  } else if (recommendation === 'AVOID') {
    confidenceScore = Math.max(80, confidenceScore);
  } else {
    confidenceScore = Math.max(50, confidenceScore);
  }

  return {
    recommendation,
    confidenceScore,
    simpleExplanation,
    bulletReasons,
    expectedBetterPriceRange,
    bestPlatform: bestDealStore
  };
}

/**
 * Generate AI decision for product purchasing.
 */
export async function generateDealDecision(input: AIDealInput): Promise<AIDealOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return runFallbackScoring(input);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const promptText = `
You are an expert retail pricing and deal intelligence agent. Analyze the following product pricing metrics and generate a purchasing decision:
Product Name: ${input.name}
Category: ${input.category}
Current Best Price: ₹${input.currentBestPrice}
Lowest Recorded Price: ₹${input.lowestRecordedPrice}
Highest Recorded Price: ₹${input.highestRecordedPrice}
7-Day Price Trend: ${input.trend7Day}
30-Day Price Trend: ${input.trend30Day}
Current Discount Percentage: ${input.discountPercentage}%
Number of competitive platforms offering similar price: ${input.similarPricePlatformsCount}
Stock Availability: ${input.stockAvailable ? 'In Stock' : 'Out of Stock'}
Price Volatility: ${input.priceVolatility.toFixed(2)}
Best Current Store: ${input.bestDealStore}

Decide if the user should BUY_NOW, WAIT, or AVOID.
Return ONLY a valid JSON object in the following format:
{
  "recommendation": "BUY_NOW" | "WAIT" | "AVOID",
  "confidenceScore": number (between 0 and 100),
  "simpleExplanation": "A short 1-2 sentence explanation of the recommendation.",
  "bulletReasons": [
    "Reason 1 with specific price details",
    "Reason 2 detailing trends",
    "Reason 3 discussing platform/volatility details"
  ],
  "expectedBetterPriceRange": "A projected realistic target price range (e.g. ₹82,000 - ₹85,000) or 'N/A'",
  "bestPlatform": "The name of the store with the best offer"
}
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptText
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API call failed: ${response.statusText}`);
    }

    const resData = await response.json();
    const textOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Empty response content from Gemini API');
    }

    const jsonResult = JSON.parse(textOutput.trim());
    return {
      recommendation: jsonResult.recommendation || 'WAIT',
      confidenceScore: typeof jsonResult.confidenceScore === 'number' ? jsonResult.confidenceScore : 70,
      simpleExplanation: jsonResult.simpleExplanation || '',
      bulletReasons: Array.isArray(jsonResult.bulletReasons) ? jsonResult.bulletReasons : [],
      expectedBetterPriceRange: jsonResult.expectedBetterPriceRange || 'N/A',
      bestPlatform: jsonResult.bestPlatform || input.bestDealStore
    };
  } catch (error) {
    console.error('Error in Gemini API execution, falling back to local engine:', error);
    return runFallbackScoring(input);
  }
}
