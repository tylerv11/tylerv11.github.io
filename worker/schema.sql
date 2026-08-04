-- Portfolio click-analytics schema
-- Run once: wrangler d1 execute portfolio-analytics --local --file=schema.sql
--           wrangler d1 execute portfolio-analytics --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       INTEGER NOT NULL,   -- epoch ms, SERVER-assigned (never trust client clocks)
  day      TEXT    NOT NULL,   -- 'YYYY-MM-DD', denormalized for cheap grouping
  type     TEXT    NOT NULL,   -- see taxonomy in docs/ANALYTICS-PLAN.md §5
  target   TEXT,               -- 'TylerVincent-Resume.pdf' | '#projects' | 'youtu.be/Ee7PgJgc0hA'
  page     TEXT    NOT NULL,   -- '/' | '/about.html'
  ms       INTEGER,            -- duration, for dwell + page_time only
  ref      TEXT,               -- referrer HOST only ('linkedin.com'), never full URL
  visitor  TEXT    NOT NULL,   -- daily-rotating salted hash
  session  TEXT,               -- random per-tab id, sessionStorage
  device   TEXT                -- 'mobile' | 'desktop' | 'tablet'
);

CREATE INDEX IF NOT EXISTS idx_events_day  ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, day);
