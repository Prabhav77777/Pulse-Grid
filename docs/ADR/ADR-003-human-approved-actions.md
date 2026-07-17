# ADR-003: Human Approval for Operations Actions

## Status

Accepted.

## Context

Recommendations can affect stadium operations and must be accountable to trained staff.

## Decision

Store AI recommendations as pending items. Require an authenticated staff member, permission check, CSRF token, and optional decision rationale before an approval or rejection is recorded.

## Consequences

PulseGrid does not autonomously execute operational actions. The audit log provides a durable decision trail within the demo runtime.
