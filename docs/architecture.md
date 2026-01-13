# Architecture Overview

## Goal
AI shopping chat agent to help users discover, compare, and understand mobile phones using a grounded catalog.

## High-level components (planned)
- UI: Chat interface (React components)
- API: `/api/chat` endpoint
- Core:
  - Intent parsing (budget/brand/features)
  - Catalog retrieval + ranking
  - Safety & refusal handling
  - Grounded response formatting

## Data
- `src/data/phones.json` as mock catalog (initial version)
- Future upgrade: Supabase/SQLite with the same repository interface
