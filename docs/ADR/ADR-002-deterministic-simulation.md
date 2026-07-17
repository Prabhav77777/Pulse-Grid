# ADR-002: Deterministic Simulation Before GenAI

## Status

Accepted.

## Context

Crowd forecasts and evacuation directions are safety-sensitive. Language models are valuable for communication but should not be the source of mathematical routing or risk calculations.

## Decision

Use graph algorithms and crowd prediction utilities for operational facts. Pass their calculated summaries to Gemini only for explanation, recommendations, chat, and report narratives.

## Consequences

Core predictions are testable and repeatable. AI output remains advisory and is validated before presentation.
