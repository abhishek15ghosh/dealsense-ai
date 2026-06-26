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
  recommendation: 'STRONG_BUY' | 'BUY_NOW' | 'WAIT' | 'STRONG_WAIT' | 'HIGH_RISK';
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

  // Confidence Calculation
  let confidenceScore = 70;
  
  if (currentBestPrice <= lowestRecordedPrice) {
    confidenceScore += 10;
  }
  
  if (priceVolatility > 0.20) {
    confidenceScore -= 15;
  } else if (priceVolatility < 0.05) {
    confidenceScore += 5;
  }
  
  if (similarPricePlatformsCount >= 2) {
    confidenceScore += 5;
  }
  
  if (!stockAvailable) {
    confidenceScore -= 15;
  }
  
  confidenceScore = Math.max(10, Math.min(100, confidenceScore));

  // Score computation to determine the recommendation class
  let score = 50;

  // 1. Price position relative to limits
  if (currentBestPrice <= lowestRecordedPrice) {
    score += 25;
  } else {
    const diffPct = (currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice;
    if (diffPct <= 0.02) {
      score += 15;
    } else if (diffPct <= 0.05) {
      score += 8;
    } else if (diffPct <= 0.10) {
      score += 2;
    } else if (diffPct > 0.15) {
      score -= 15;
    }
  }

  const range = highestRecordedPrice - lowestRecordedPrice;
  if (range > 0) {
    const position = (highestRecordedPrice - currentBestPrice) / range; // 1 = lowest, 0 = highest
    if (position < 0.2) {
      score -= 15;
    } else if (position > 0.8) {
      score += 10;
    }
  }

  // 2. Trends
  if (trend7Day === 'down') score += 8;
  if (trend7Day === 'up') score -= 12;
  if (trend30Day === 'down') score += 4;
  if (trend30Day === 'up') score -= 6;

  // 3. Discount
  score += Math.min(20, discountPercentage * 0.4);
  score = Math.max(10, Math.min(100, score));

  // Determine Recommendation Category
  let recommendation: 'STRONG_BUY' | 'BUY_NOW' | 'WAIT' | 'STRONG_WAIT' | 'HIGH_RISK';
  let simpleExplanation = '';
  let bulletReasons: string[] = [];
  let expectedBetterPriceRange = '';

  // Priority check for HIGH RISK
  if (!stockAvailable || priceVolatility >= 0.20) {
    recommendation = 'HIGH_RISK';
    simpleExplanation = `Pricing for ${input.name} shows high volatility (${Math.round(priceVolatility * 100)}%) or stock limitations. We advise extreme caution.`;
    bulletReasons = [
      `Price volatility index is high at ${Math.round(priceVolatility * 100)}%, suggesting potential artificial markup.`,
      `Stock availability is restricted or unavailable across prime online retailers.`,
      `Expected pricing trajectory is highly unstable in the short term.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.05).toLocaleString('en-IN')}`;
  } else if (score >= 80 && currentBestPrice <= lowestRecordedPrice * 1.02) {
    recommendation = 'STRONG_BUY';
    simpleExplanation = `${input.name} is at an absolute bargain price, trading within 2% of its historical lowest recorded price.`;
    bulletReasons = [
      `Current price ₹${currentBestPrice.toLocaleString('en-IN')} is extremely close to the all-time low of ₹${lowestRecordedPrice.toLocaleString('en-IN')}.`,
      `Solid discount rate of ${discountPercentage}% detected across competitive retailers.`,
      `Stable price trends indicate a low likelihood of further price reductions soon.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.01).toLocaleString('en-IN')}`;
  } else if (score >= 65) {
    recommendation = 'BUY_NOW';
    simpleExplanation = `Current pricing for ${input.name} is highly favorable, representing a solid purchase window.`;
    bulletReasons = [
      `Current price is within ${Math.round(((currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice) * 100)}% of the lowest recorded price.`,
      `Healthy discount structure of ${discountPercentage}% relative to original MSRP.`,
      `Price trends suggest stable market conditions suitable for purchasing.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.03).toLocaleString('en-IN')}`;
  } else if (score >= 40) {
    recommendation = 'WAIT';
    simpleExplanation = `Prices for ${input.name} are average. Holding off for upcoming retail promotions is recommended.`;
    bulletReasons = [
      `Current price is approximately ${Math.round(((currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice) * 100)}% higher than the historical lowest.`,
      `Price trends over the last 7 days are stable, suggesting no urgent pressure to buy.`,
      `Better deals are anticipated during upcoming promotional sales cycles.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.04).toLocaleString('en-IN')}`;
  } else {
    recommendation = 'STRONG_WAIT';
    simpleExplanation = `Pricing for ${input.name} is heavily marked up. We strongly recommend holding off on a purchase at this valuation.`;
    bulletReasons = [
      `Current price is close to the historical peak of ₹${highestRecordedPrice.toLocaleString('en-IN')}.`,
      `Price sits ${Math.round(((currentBestPrice - lowestRecordedPrice) / lowestRecordedPrice) * 100)}% above the lowest recorded rate.`,
      `Pricing trajectory shows an upward inflation trend, making now a poor time to buy.`
    ];
    expectedBetterPriceRange = `₹${lowestRecordedPrice.toLocaleString('en-IN')} - ₹${Math.round(lowestRecordedPrice * 1.03).toLocaleString('en-IN')}`;
  }

  return {
    recommendation,
    confidenceScore: Math.round(confidenceScore),
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

Decide if the user should STRONG_BUY, BUY_NOW, WAIT, STRONG_WAIT, or HIGH_RISK.
Return ONLY a valid JSON object in the following format:
{
  "recommendation": "STRONG_BUY" | "BUY_NOW" | "WAIT" | "STRONG_WAIT" | "HIGH_RISK",
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
    const validRecommendations = ['STRONG_BUY', 'BUY_NOW', 'WAIT', 'STRONG_WAIT', 'HIGH_RISK'];
    let recommendation = jsonResult.recommendation || 'WAIT';
    if (!validRecommendations.includes(recommendation)) {
      if (recommendation === 'AVOID') {
        recommendation = 'STRONG_WAIT';
      } else if (recommendation === 'BUY_NOW' || recommendation === 'BUY NOW') {
        recommendation = 'BUY_NOW';
      } else {
        recommendation = 'WAIT';
      }
    }

    return {
      recommendation: recommendation as 'STRONG_BUY' | 'BUY_NOW' | 'WAIT' | 'STRONG_WAIT' | 'HIGH_RISK',
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
