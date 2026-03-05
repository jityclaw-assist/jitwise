ROADMAP.md — Jitwise Development Roadmap
Project Vision

Jitwise is a scope-first software estimation framework for developers.

The goal of the product is to help developers:

Structure project scope

Model complexity explicitly

Generate defendable estimates

Communicate pricing clearly to clients

The system prioritizes structured thinking over automation.

Development Strategy

The roadmap follows four principles:

Build core estimation logic first

Ship a usable MVP quickly

Validate developer workflows

Expand features only when necessary

Avoid building:

dashboards without usage

complex collaboration features

billing systems

AI layers too early

Phase 0 — Foundation (Current Phase)

Goal: establish a stable project architecture.

Tasks

Project setup:

Next.js App Router

TypeScript strict mode

pnpm workspace

TailwindCSS

Supabase project

Repository structure:

app/
components/
lib/

Core library structure:

lib/catalog
lib/engine
lib/schema
lib/summary

Infrastructure:

Supabase authentication

Supabase database

Supabase storage

Row Level Security policies

Deliverables:

authenticated users

database schema ready

project compiles and runs

Phase 1 — Core Estimation Engine

Goal: implement the deterministic estimation system.

This is the most critical component of Jitwise.

Tasks

Define module catalog:

lib/catalog/modules.ts

Each module includes:

feature name

complexity levels

base points

Example modules:

authentication

payments

dashboard

API integrations

admin panel

notifications

Implement engine logic:

lib/engine/calculate-estimation.ts

Responsibilities:

aggregate scope points

apply risk multiplier

apply urgency multiplier

generate effort range

calculate pricing range

Output must include:

total points

min hours

probable hours

max hours

price range

Deliverables:

pure estimation engine

testable logic

deterministic results

Phase 2 — Estimation Interface

Goal: allow users to create estimations through the UI.

Tasks

Create estimator interface:

/app/(app)/estimate

Components:

components/estimate/

UI elements:

module selectors

complexity dropdowns

risk level slider

urgency level slider

hourly rate input

Workflow:

user selects modules

engine computes estimate

results displayed

Deliverables:

interactive estimator

structured output preview

Phase 3 — Persistence Layer

Goal: allow users to save and manage estimations.

Tasks

Database tables already defined:

profiles

estimations

documents

Implement:

Create estimation

POST /estimations

Fetch user estimations

GET /estimations

Fetch single estimation

GET /estimations/:id

Delete estimation

DELETE /estimations/:id

UI features:

estimation list

open previous estimations

delete estimations

Deliverables:

persistent estimations

user history

Phase 4 — Client Summary Generator

Goal: generate professional summaries that can be shared with clients.

Implement:

lib/summary/generate-client-summary.ts

Summary should include:

project scope breakdown

complexity explanation

estimated effort range

pricing range

risk considerations

UI features:

copy summary

export summary

preview client version

Deliverables:

structured professional output

client-ready explanation

Phase 5 — Documents System

Goal: allow attaching documents to estimations.

Examples:

requirement documents

technical specs

exported proposals

Implementation:

Supabase Storage + metadata table.

Capabilities:

upload documents

attach to estimations

view documents

Deliverables:

document storage

estimation attachments

Phase 6 — Estimation Quality Insights

Goal: improve estimation accuracy over time.

Possible features:

historical comparison

estimate vs real outcome tracking

complexity calibration

Metrics:

average project size

risk patterns

module cost averages

Deliverables:

analytics foundations

Phase 7 — AI Scope Advisor (Future)

Goal: assist developers in improving scope clarity.

AI should never replace the estimation engine.

Possible use cases:

identify missing modules

suggest scope improvements

detect underestimated complexity

Example prompts:

“This project may require authentication flows.”

“Payment modules often include webhook handling.”

Deliverables:

optional AI insights

non-deterministic advisory layer

Phase 8 — Export System

Goal: export estimation reports.

Formats:

PDF proposal

Markdown summary

JSON export

Use cases:

send to clients

attach to project proposals

archive estimations

Deliverables:

shareable outputs

Phase 9 — CLI Tool (Long Term)

Goal: allow developers to run Jitwise from terminal.

Example usage:

jitwise estimate project.json

Capabilities:

load project config

run estimation engine

output report

Deliverables:

CLI wrapper around engine

Phase 10 — Team Collaboration (Future)

Goal: allow multiple developers to work on estimates.

Potential features:

shared workspaces

version history

collaborative estimation

This phase should only start if real demand appears.

MVP Definition

The MVP should include:

authentication

estimation engine

estimation UI

save estimations

client summary generation

Everything else is optional.

Success Criteria for MVP

The MVP succeeds if developers can:

Log in

Create an estimation

See structured effort ranges

Save estimations

Generate a professional summary

Development Discipline

When implementing features:

build smallest working version

validate workflow

iterate

Avoid building speculative systems.

Final Guideline

Jitwise should feel like a professional engineering tool, not a startup experiment.

The codebase must remain:

structured

minimal

deterministic

maintainable

All new features must respect these principles.