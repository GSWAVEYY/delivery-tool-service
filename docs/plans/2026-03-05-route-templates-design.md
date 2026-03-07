# Route Templates — Design

**Core concept:** Any driver can save a route as a shared template. All templates visible to everyone. New route creation starts from a template, pre-filling everything (name, platform, stops, notes).

## Data Model

- `RouteTemplate` — name, platformLinkId, notes, createdBy
- `TemplateStop` — address, city, state, zipCode, sequence, facility fields
- Templates shared by default (not scoped to userId for reads), track createdBy for attribution

## API Endpoints

- `POST /routes/templates` — save route as template (pass routeId, snapshots stops)
- `GET /routes/templates` — list all templates (shared)
- `POST /routes/templates/:id/use` — create route from template (copies everything, today's date)
- `DELETE /routes/templates/:id` — only creator can delete

## Mobile UX

- Routes tab gets "Start from Template" button at top
- Template picker shows cards: name, platform, stop count, creator
- Tapping template creates today's route, navigates to it
- "Save as Template" button on route detail / after completion

## What Carries Over

Route name, platform link, notes, all stops (address, sequence, facility info). Status resets to ASSIGNED, date to today, stops reset to PENDING.
