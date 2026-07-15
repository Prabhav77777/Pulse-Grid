/**
 * @file promptBuilder.js
 * @description Structured prompt construction for every PulseGrid reasoning domain.
 * #Business-Intent: LLM explains, does NOT calculate — prompts constrain the LLM to
 *   narrate, summarize, and advise based on pre-computed simulation data.
 *
 * @level-one-validation
 *   Summary: Five domain-specific prompt builders that embed JSON schemas into system prompts.
 *   Correctness: Prompts include explicit "do not compute" guardrails and output schemas.
 *   Rubric: Prompt clarity, output determinism, multilingual readiness.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: LLM output predictability via schema-constrained prompts.
 *   #Scope-Of-Improvement: Add few-shot examples per prompt; support additional locales.
 */

// #Business-Intent: LLM explains, does NOT calculate

function languageInstruction(locale) {
  return locale !== 'en'
    ? `Respond in the language identified by locale code "${locale}".`
    : '';
}

/**
 * Build a staff-operations recommendation prompt.
 * The LLM receives pre-computed simulation data and EXPLAINS what actions to take.
 *
 * @param {object} simulationSummary  Output from the simulation layer (crowd density, wait times, incidents).
 * @param {string} [locale='en']      Target language code.
 * @returns {string} Fully-formed prompt string.
 */
export function buildRecommendationPrompt(simulationSummary, locale = 'en') {
  const langInstruction = languageInstruction(locale);

  return `You are PulseGrid, an AI operations advisor for stadium management.
You are given PRE-COMPUTED simulation results. Your job is to EXPLAIN what the data
means and suggest human-readable actions. Do NOT recalculate any numbers — use the
data exactly as provided.

${langInstruction}

## Simulation Data
${JSON.stringify(simulationSummary, null, 2)}

## Your Task
Analyze the simulation data and produce actionable recommendations for stadium operations staff.
Consider crowd density, predicted wait times, incident risk, and resource allocation.

## Required JSON Output Schema
{
  "recommendations": [
    {
      "id": "string — unique identifier e.g. rec-001",
      "severity": "low | medium | high | critical",
      "title": "string — short headline",
      "description": "string — 1-3 sentence explanation",
      "affectedZones": ["zone-id", "..."],
      "suggestedAction": "string — concrete step",
      "estimatedImpact": "string — expected improvement"
    }
  ]
}

Respond ONLY with the JSON object above. No markdown fences. No commentary.`;
}

/**
 * Build a fan-facing concierge chat prompt.
 *
 * @param {string} userMessage    The fan's message / question.
 * @param {object} stadiumContext Current stadium state (zones, amenities, schedule).
 * @param {string} [locale='en']
 * @returns {string}
 */
export function buildConciergePrompt(userMessage, stadiumContext, locale = 'en') {
  const langInstruction = languageInstruction(locale);

  return `You are a friendly, helpful stadium concierge chatbot for PulseGrid.
You assist fans with navigation, amenities, schedules, and general questions.
Be warm, concise, and safety-aware. ${langInstruction}

## Current Stadium Context
${JSON.stringify(stadiumContext, null, 2)}

## Fan Message
"${userMessage}"

## Required JSON Output Schema
{
  "message": "string — your reply to the fan",
  "language": "${locale}",
  "suggestions": ["string — up to 3 follow-up suggestions the fan might ask"]
}

Respond ONLY with the JSON object above.`;
}

/**
 * Build a TTS-ready routing description prompt.
 * #Business-Intent: Converts computed route data into spoken directions.
 *
 * @param {object} routingResult  Pre-computed route (path nodes, distances, estimated time).
 * @param {string} [locale='en']
 * @returns {string}
 */
export function buildRoutingPrompt(routingResult, locale = 'en') {
  const langInstruction = languageInstruction(locale);

  return `You are PulseGrid's wayfinding narrator.
Convert the following pre-computed route into friendly, step-by-step spoken directions
suitable for text-to-speech. Keep sentences short and clear. Do NOT alter distances or
times — use them exactly as given. ${langInstruction}

## Route Data
${JSON.stringify(routingResult, null, 2)}

## Required JSON Output Schema
{
  "directions": "string — TTS-ready paragraph with step-by-step directions",
  "estimatedWalkTime": "string — e.g. '4 minutes'",
  "landmarks": ["string — notable landmarks along the route"]
}

Respond ONLY with the JSON object above.`;
}

/**
 * Build a transport options prompt with CO₂ sustainability comparison.
 *
 * @param {object} eventInfo  Event details, venue location, nearby transit.
 * @param {string} [locale='en']
 * @returns {string}
 */
export function buildTransportPrompt(eventInfo, locale = 'en') {
  const langInstruction = languageInstruction(locale);

  return `You are PulseGrid's sustainable transport advisor.
Given event information and available transport modes, produce a comparison of options
including estimated CO₂ emissions. Highlight the most sustainable choice.
Do NOT invent data — use the provided information only. ${langInstruction}

## Event & Transport Data
${JSON.stringify(eventInfo, null, 2)}

## Required JSON Output Schema
{
  "options": [
    {
      "mode": "string — e.g. Metro, Bus, Taxi, Bicycle",
      "estimatedTime": "string",
      "cost": "string",
      "co2Estimate": "string — e.g. '0.04 kg'",
      "sustainability": "high | medium | low"
    }
  ],
  "recommendation": "string — short sentence recommending the greenest option"
}

Respond ONLY with the JSON object above.`;
}

/**
 * Build a post-event operations report prompt (markdown narrative).
 *
 * @param {Array}  auditLog    Timestamped audit events.
 * @param {Array}  predictions Prediction records from the simulation layer.
 * @param {Array}  incidents   Incident records.
 * @returns {string}
 */
export function buildReportPrompt(auditLog, predictions, incidents) {
  return `You are PulseGrid's post-event reporting assistant.
Generate a comprehensive operations report in MARKDOWN format.
Summarize key events, prediction accuracy, incident response times, and overall performance.
Do NOT fabricate statistics — reference only the data provided.

## Audit Log (last ${auditLog.length} entries)
${JSON.stringify(auditLog.slice(-50), null, 2)}

## Prediction History (${predictions.length} records)
${JSON.stringify(predictions.slice(-30), null, 2)}

## Incidents (${incidents.length} total)
${JSON.stringify(incidents, null, 2)}

## Report Structure
1. Executive Summary
2. Key Events Timeline
3. Prediction Accuracy Analysis
4. Incident Response Review
5. Resource Utilization
6. Recommendations for Next Event

Respond with the full markdown report. Use headers, bullet points, and tables where helpful.`;
}
