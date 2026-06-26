export interface PricePredictionInput {
  productId: string;
  productName: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  history: Array<{ date?: string; price?: number; timestamp?: Date; Amazon?: number; Flipkart?: number; Croma?: number; 'Reliance Digital'?: number }>;
}

export interface PricePredictionOutput {
  nextPredictedDropDate: string;
  predictedDropAmount: number;
  confidenceScore: number;
  forecast: Array<{ date: string; price: number }>;
  analysis: string;
}

/**
 * Local fallback pricing prediction engine using regression/trend analysis.
 */
function runLocalFallbackPrediction(input: PricePredictionInput): PricePredictionOutput {
  const { currentPrice, lowestPrice, highestPrice, history } = input;
  
  // 1. Gather numerical points from history
  const points = history
    .map(h => h.price ?? h.Amazon ?? h.Flipkart ?? h.Croma ?? h['Reliance Digital'] ?? 0)
    .filter(p => p > 0);

  if (points.length === 0) {
    points.push(currentPrice);
  }

  // 2. Perform simple linear regression to find price trend slope
  let slope = 0;
  if (points.length > 1) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += points[i];
      sumXY += i * points[i];
      sumXX += i * i;
    }
    const num = n * sumXY - sumX * sumY;
    const den = n * sumXX - sumX * sumX;
    slope = den !== 0 ? num / den : 0;
  } else {
    // If no history, assume stable or minor downward trajectory (-0.2% per day)
    slope = -0.002 * currentPrice;
  }

  // Bounded slope to prevent extreme projections
  const maxSlopeChange = 0.02 * currentPrice; // Max 2% change per day
  slope = Math.max(-maxSlopeChange, Math.min(maxSlopeChange, slope));

  // 3. Generate 7-day daily forecast
  const forecast: Array<{ date: string; price: number }> = [];
  const startDay = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const forecastDate = new Date(startDay);
    forecastDate.setDate(startDay.getDate() + i);
    
    const dateStr = forecastDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    
    // Add sinusoidal weekly fluctuation to simulate retail shifts
    const weeklyFluctuation = Math.sin((forecastDate.getDay() / 7) * 2 * Math.PI) * (0.015 * currentPrice);
    
    // Projected price
    let projected = currentPrice + (slope * i) + weeklyFluctuation;
    
    // Bounded by absolute logical thresholds
    const absoluteMin = lowestPrice * 0.85;
    const absoluteMax = highestPrice * 1.15;
    projected = Math.max(absoluteMin, Math.min(absoluteMax, projected));
    
    forecast.push({
      date: dateStr,
      price: Math.round(projected)
    });
  }

  // 4. Calculate next predicted drop date and drop size
  let nextPredictedDropDate = 'N/A';
  let predictedDropAmount = 0;
  let confidenceScore = 70;
  let analysis = '';

  const expectedDropPercent = slope < 0 ? Math.min(0.12, Math.abs(slope * 5) / currentPrice) : 0.03;
  predictedDropAmount = Math.round(currentPrice * expectedDropPercent);
  // Round to nearest 50
  predictedDropAmount = Math.round(predictedDropAmount / 50) * 50;

  if (predictedDropAmount > 0) {
    const dropDate = new Date();
    // Usually sales occur on weekends or in 5-9 days
    const daysToDrop = slope < 0 ? 4 : 8;
    dropDate.setDate(startDay.getDate() + daysToDrop);
    nextPredictedDropDate = dropDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  }

  // Calculate confidence based on price stability and history length
  const volatility = lowestPrice > 0 ? (highestPrice - lowestPrice) / lowestPrice : 0;
  if (volatility > 0.20) {
    confidenceScore = 65; // lower confidence in volatile markets
  } else if (history.length > 5) {
    confidenceScore = 85; // higher confidence with more history
  }

  if (slope < -50) {
    analysis = `The price trend for ${input.productName} is in a steady decline. We expect a drop of around ₹${predictedDropAmount.toLocaleString('en-IN')} by ${nextPredictedDropDate}.`;
  } else if (slope > 50) {
    analysis = `Pricing for ${input.productName} is currently rising or experiencing listing markups. We recommend waiting for future promotional events.`;
  } else {
    analysis = `Pricing is highly stable. Minimal fluctuations of ₹${predictedDropAmount.toLocaleString('en-IN')} are projected for the upcoming days.`;
  }

  return {
    nextPredictedDropDate,
    predictedDropAmount,
    confidenceScore,
    forecast,
    analysis
  };
}

/**
 * Generate AI Pricing Forecast utilizing Gemini API or fallback scoring
 */
export async function generatePricePrediction(input: PricePredictionInput): Promise<PricePredictionOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return runLocalFallbackPrediction(input);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Map chronological history details
    const historySummary = input.history
      .map(h => {
        const d = h.date || (h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'Unknown');
        const p = h.price ?? h.Amazon ?? h.Flipkart ?? h.Croma ?? h['Reliance Digital'] ?? 0;
        return `${d}: ₹${p}`;
      })
      .filter(line => !line.includes('₹0'))
      .slice(-15) // Keep last 15 entries
      .join('\n');

    const promptText = `
You are an expert financial forecaster and retail price analyst. Analyze the following historical price data of a product and project its price movements over the next 7 days.
Product Name: ${input.productName}
Current Best Price: ₹${input.currentPrice}
Lowest Recorded Price: ₹${input.lowestPrice}
Highest Recorded Price: ₹${input.highestPrice}

Historical Pricing Data:
${historySummary}

Project the future trajectory of the product pricing. Specifically, identify:
1. The estimated date of the next major price drop (return format like "Jul 12, 2026" or "N/A").
2. The estimated next price drop savings magnitude in INR (return number only).
3. The model forecast confidence score (return number between 0 and 100).
4. A 7-item chronological array of daily forecast predictions for the next 7 days, estimating the projected lowest price. Use the format "MMM DD" (e.g. "Jun 27") for the dates.
5. A brief 1-2 sentence analysis of the pricing trajectory.

Return ONLY a valid JSON object in this format:
{
  "nextPredictedDropDate": "MMM DD, YYYY" | "N/A",
  "predictedDropAmount": number,
  "confidenceScore": number,
  "forecast": [
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number},
    {"date": "MMM DD", "price": number}
  ],
  "analysis": "Brief analysis string"
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
      throw new Error('Empty response from Gemini API');
    }

    const jsonResult = JSON.parse(textOutput.trim());
    
    // Validate output structure
    const forecast = Array.isArray(jsonResult.forecast) && jsonResult.forecast.length === 7
      ? jsonResult.forecast.map((f: { date?: unknown; price?: unknown }) => ({
          date: String(f.date || ''),
          price: Number(f.price || 0)
        }))
      : runLocalFallbackPrediction(input).forecast;

    return {
      nextPredictedDropDate: jsonResult.nextPredictedDropDate || 'N/A',
      predictedDropAmount: typeof jsonResult.predictedDropAmount === 'number' ? jsonResult.predictedDropAmount : 0,
      confidenceScore: typeof jsonResult.confidenceScore === 'number' ? jsonResult.confidenceScore : 70,
      forecast,
      analysis: jsonResult.analysis || ''
    };
  } catch (error) {
    console.error('Error in Gemini API forecasting execution, falling back to local engine:', error);
    return runLocalFallbackPrediction(input);
  }
}
