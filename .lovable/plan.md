

# Plan: Post-Game Report, Data Persistence Fix, and 2D Sync

## Overview

Four main tasks to implement:

1. **Post-game report** — auto-generated after each match with tactical analysis, individual highlights, and ranking impact
2. **Data persistence fix** — notifications and game data persist across sessions
3. **2D sync fix** — ball movement and events stay continuous; events don't only appear when leaving
4. **Testing** — verify simulation generates consistent scores, penalties, dangerous fouls, and 2D sync

---

## Task 1: Post-Game Report

### Database
Create a `match_reports` table:
- `id`, `user_id`, `match_history_id` (FK), `competition`, `home_team`, `away_team`, `home_goals`, `away_goals`, `result` (win/draw/loss), `report_data` (JSONB — full analysis), `ranking_impact` (integer), `created_at`
- RLS: users can only read their own reports

### Edge Function (start-match)
After simulation, generate report data server-side and include it in the `match_history` insert. The report JSONB includes:
- **General**: competition, score, result type (win/draw/rout_win/etc)
- **Positives**: top stats (possession dominance, shot accuracy, clean sheet)
- **Negatives**: weaknesses (low possession, too many fouls, goals conceded)
- **Individual highlights**: best player (highest rating), worst player, top scorer, assists
- **Tactical analysis**: pressing effectiveness, play style impact
- **Impacts**: morale change, ranking points gained/lost, fatigue, financial (gate revenue estimate)

### Frontend
Create `PostGameReportModal` component shown after match finishes (in MatchPage finished state or on return to Index). Displays:
- Score + result badge
- Positive/negative analysis cards
- Individual highlight cards (best/worst player with ratings)
- Ranking impact indicator (+/- points)
- Save as notification for later viewing

### Notification Integration
On match finish, insert a notification record into a `user_notifications` table (new) so it persists across sessions.

---

## Task 2: Data Persistence Fix

### New `user_notifications` table
- `id`, `user_id`, `type`, `title`, `message`, `icon`, `created_at`, `read_at`
- RLS: users read/update only their own
- Current notifications are ephemeral (localStorage + in-memory). Move to DB.

### NotificationBell refactor
- Fetch notifications from `user_notifications` table instead of building in-memory
- Mark-as-read updates `read_at` in DB
- Keep welcome/tips notifications as seed data inserted on club creation
- Match results, transfers, and other events write to `user_notifications`

### Game state persistence
- Ensure `applyServerResult` in Index.tsx properly saves to the club's JSONB state
- Verify auto-save writes all relevant data including notification read states

---

## Task 3: 2D Sync and Continuous Events

### Problem
The simulation generates events for every minute (1-90), but the `SimulationEngine.getSnapshot()` uses time-based progress that may skip minutes or cluster them. The 2D ball position updates only when React re-renders visible events.

### Fix — SimulationEngine
- Add `ballX`/`ballY` interpolation: between events, interpolate ball position smoothly based on fractional minute progress (not just discrete minute boundaries)
- The engine already has events for every minute from the server — the issue is the tick interval (1s) vs the 12-minute real-time mapping

### Fix — MatchManager tick
- Change tick interval from 1000ms to 500ms for smoother event revelation
- Ensure `_emitUpdate()` fires consistently regardless of event density

### Fix — Pitch2DView
- Already has continuous ball drift and lerp — verify it works with faster ticks
- Add intermediate ball positions for minutes without events (use interpolation between prev/next event `ballX`/`ballY`)
- Ensure canvas animation loop runs at 60fps (already using `requestAnimationFrame`)

### Fix — "Events only when leaving"
This is likely caused by `_startTick()` not being called or the update callback not being set before events are ready. Verify:
- `setUpdateCallback` is called before `loadFromDb`/`startNewMatch`
- The tick fires `_emitUpdate()` on every cycle, not just when new events appear

---

## Task 4: Testing

After implementation, manually test a friendly match against AI FC to verify:
- Scores are consistent (Poisson-based, not always 0-0 or extreme)
- Penalties and dangerous fouls appear in events
- 2D ball moves continuously throughout the match
- Events appear in real-time without needing to leave/return
- Post-game report shows with meaningful analysis
- Notifications persist after page reload

---

## Implementation Order

1. DB migration: `match_reports` + `user_notifications` tables with RLS
2. Update `start-match` Edge Function to generate report data
3. Create `PostGameReportModal` component
4. Wire report display into MatchPage finished state and Index.tsx
5. Refactor NotificationBell to use DB-backed notifications
6. Fix SimulationEngine tick interval and 2D sync
7. Test end-to-end

