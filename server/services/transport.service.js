import geminiClient from "../reasoning/geminiClient.js";

import {
  buildTransportPrompt,
} from "../reasoning/promptBuilder.js";

import {
  validateTransportResponse,
} from "../reasoning/responseValidator.js";

const EVENT_INFO = {
  eventName: "FIFA World Cup 2026 Match",

  venue: "PulseGrid Arena",

  nearbyTransit: [
    {
      mode: "Metro",
      line: "Line 1",
      station: "Stadium Station",
      headway: "5 min",
    },
    {
      mode: "Bus",
      route: "Line 42",
      stop: "Gate 3 Bus Bay",
      headway: "10 min",
    },
    {
      mode: "Taxi / Rideshare",
      pickupPoint: "Zone C Parking",
      availability: "High",
    },
  ],
};

export async function getRecommendations(body) {
  try {
    const { locale = "en" } = body;

    const prompt = buildTransportPrompt(
      EVENT_INFO,
      locale
    );

    const raw = await geminiClient.generateJSON(
      prompt,
      { options: [] }
    );

    const validation =
      validateTransportResponse(raw);

    if (validation.valid) {
      return {
        options: validation.data.options,
        source: "ai",
      };
    }

    console.warn(
      "[transport] validation failed",
      validation.errors
    );

    return {
      options: getDefaultTransportOptions(),
      source: "fallback",
    };
  } catch (err) {
    console.error(err);

    return {
      options: getDefaultTransportOptions(),
      source: "fallback",
    };
  }
}

function getDefaultTransportOptions() {
  return [
    {
      mode: "Metro",
      estimatedTime: "25 min",
      cost: "$2.50",
      co2Estimate: "0.04 kg",
      sustainability: "🌿 Very Low Impact",
    },
    {
      mode: "Bus",
      estimatedTime: "35 min",
      cost: "$1.75",
      co2Estimate: "0.08 kg",
      sustainability: "🌿 Low Impact",
    },
    {
      mode: "Rideshare",
      estimatedTime: "20 min",
      cost: "$15.00",
      co2Estimate: "0.45 kg",
      sustainability: "⚠️ Medium Impact",
    },
    {
      mode: "Taxi",
      estimatedTime: "18 min",
      cost: "$25.00",
      co2Estimate: "0.52 kg",
      sustainability: "⚠️ Medium Impact",
    },
  ];
}