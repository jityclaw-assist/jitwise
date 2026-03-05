AGENTS.md — Jitwise Development Protocol
Project Identity

Project name: Jitwise
Type: Developer tool
Category: Scope-first software estimation framework

Jitwise helps developers:

Structure project scope

Model project complexity

Generate defendable estimates

Communicate pricing with clarity

Jitwise is not:

An AI pricing generator

A vague productivity tool

A no-code estimator

A marketing-heavy SaaS

It is an engineering-grade estimation system.

All code and design decisions must reinforce this positioning.

Core Development Philosophy

When generating code for this project, prioritize:

Clarity over cleverness

Structure over speed

Determinism over automation

Maintainability over abstraction

Performance over unnecessary features

Agents must avoid hype features and premature complexity.

Tech Stack

This project uses:

Next.js (App Router)

TypeScript (strict mode)

pnpm

TailwindCSS

Supabase (Auth + Database + Storage)

Zod for validation

Do not introduce new dependencies unless clearly justified.

Avoid large frameworks or unnecessary libraries.

Architectural Rules

The architecture must remain strictly layered.

app/
  (marketing)/
  (app)/
    estimate/

components/
  landing/
  estimate/
  ui/
  shared/

lib/
  catalog/
  engine/
  schema/
  summary/
Responsibilities

/app

routing

layouts

page composition

/components

UI only

no business logic

/lib/catalog

module definitions

complexity scoring metadata

/lib/engine

estimation logic

deterministic calculations

no side effects

no UI code

/lib/schema

Zod schemas

request validation

type definitions

/lib/summary

generation of client-facing summaries

Estimation Engine Constraints

The engine must remain pure and deterministic.

Engine functions must:

accept structured input

return structured output

avoid formatting logic

avoid side effects

Example structure:

calculateEstimation(input: EstimationInput): EstimationResult

The result must include:

base scope points

risk multiplier

urgency multiplier

hours range (min / probable / max)

pricing range

The engine must never access database, UI, or environment variables.

Supabase Integration Rules

Supabase is used for:

authentication

persistence

storage

Tables currently defined:

profiles

estimations

documents

Rules:

always rely on Row Level Security

never trust userId sent from frontend

derive userId from session

queries must be filtered by authenticated user

Performance Guidelines

When generating code:

Prefer:

server components where possible

minimal client state

memoized computations

small reusable components

Avoid:

unnecessary global state

excessive re-renders

heavy dependencies

large monolithic components

All code must remain lean and predictable.

Code Quality Requirements

Generated code must:

use strict TypeScript

avoid any

avoid implicit logic

use clear naming

remain readable

Naming conventions:

Type	Format
Component	PascalCase
Functions	camelCase
Types	PascalCase
Files	kebab-case
Constants	UPPER_CASE
UI Design Principles

The UI must feel:

professional

minimal

engineering-focused

Avoid:

flashy animations

excessive visual noise

marketing language

buzzwords like "AI powered"

Design inspiration:

Linear

Vercel

Raycast

Resend

Feature Scope Control

Agents must not introduce features beyond MVP scope unless explicitly requested.

Avoid introducing:

billing systems

team workspaces

complex role systems

dashboards not requested

AI features beyond defined scope

Focus on core estimation workflow.

Development Workflow

Agents should follow this workflow when making changes.

Step 1 — Understand the request

Before generating code, confirm:

scope of change

affected modules

architecture impact

If uncertain, ask clarification questions.

Step 2 — Propose approach

Briefly explain:

what files will change

what logic will be added

why the approach respects architecture

Step 3 — Implement

Generate code that:

respects folder boundaries

remains minimal

follows TypeScript discipline

avoids unnecessary abstraction

Step 4 — Explain changes

After implementation, summarize:

files created or modified

architectural reasoning

potential future considerations

Step 5 — Ask for confirmation

Every change must end with:

Do you want to keep these changes,
adjust something,
or revert them?

The agent must never assume permanent acceptance of changes.

Refactoring Rules

Refactoring is allowed only if:

it improves clarity

it improves performance

it reduces technical debt

Agents must never refactor large parts of the codebase without explicit approval.

Long-Term Vision

Future capabilities may include:

AI-assisted scope review

estimation history analysis

exportable summaries

CLI interface

team collaboration

The current architecture must remain flexible enough to support these features later.

Agent Behavioral Directive

When assisting in this repository, the agent must behave like a senior software engineer reviewing a professional codebase.

Always:

prioritize architectural integrity

maintain disciplined structure

keep solutions minimal

preserve performance

avoid hype and unnecessary complexity

Every decision must reflect engineering maturity.

Final Interaction Requirement

After completing any change, the agent must always ask:

"Do you want to keep these changes or revert them?"

This ensures controlled iteration during vibe-coding.