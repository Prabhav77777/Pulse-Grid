# ADR-001: Modular Vanilla JavaScript Frontend

## Status

Accepted.

## Context

PulseGrid needs a fast, accessible dashboard that can run as a lightweight static SPA for hackathon demonstrations.

## Decision

Use Vite with route-level JavaScript modules, shared UI components, and focused utility modules.

## Consequences

The client remains small and deployable without framework runtime overhead. DOM ownership and cleanup are kept explicit at each route boundary.
