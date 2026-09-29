-- Premier Visibility schema. Every statement is idempotent; the app runs this on cold start.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'editor',          -- admin | editor | viewer
  pass_hash     TEXT NOT NULL,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per page: the current SEO/AEO brief.
CREATE TABLE IF NOT EXISTS pages (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL,
  brief       JSONB NOT NULL,
  score       INT NOT NULL DEFAULT 0,
  fails       INT NOT NULL DEFAULT 0,
  version     INT NOT NULL DEFAULT 0,
  archived    BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  INT REFERENCES users(id)
);

-- Every saved brief, so any change can be diffed or restored.
CREATE TABLE IF NOT EXISTS page_versions (
  id          SERIAL PRIMARY KEY,
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  brief       JSONB NOT NULL,
  score       INT NOT NULL,
  fails       INT NOT NULL,
  changed     JSONB NOT NULL DEFAULT '[]',
  note        TEXT NOT NULL DEFAULT '',
  user_id     INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, version)
);

-- What the live page actually serves: title, meta, robots, H1, schema, and so on.
CREATE TABLE IF NOT EXISTS live_snapshots (
  id          SERIAL PRIMARY KEY,
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      INT NOT NULL,
  data        JSONB NOT NULL,
  hash        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS live_snapshots_page ON live_snapshots (page_id, fetched_at DESC);

-- The activity feed: brief saves, live changes, incidents, plugin updates, maintenance.
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind        TEXT NOT NULL,            -- brief | live | uptime | ssl | plugins | maintenance | system
  severity    TEXT NOT NULL DEFAULT 'info',   -- info | warn | critical | good
  page_id     TEXT,
  title       TEXT NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}',
  user_id     INT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS events_at ON events (at DESC);

CREATE TABLE IF NOT EXISTS monitors (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  must_contain  TEXT NOT NULL DEFAULT '',
  active        BOOLEAN NOT NULL DEFAULT true,
  state         TEXT NOT NULL DEFAULT 'unknown',   -- up | down | unknown
  fail_count    INT NOT NULL DEFAULT 0,
  last_checked  TIMESTAMPTZ,
  last_status   INT,
  last_ms       INT,
  last_error    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS checks (
  id          BIGSERIAL PRIMARY KEY,
  monitor_id  INT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok          BOOLEAN NOT NULL,
  status      INT,
  ms          INT,
  error       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS checks_monitor_at ON checks (monitor_id, at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id           SERIAL PRIMARY KEY,
  monitor_id   INT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL,
  resolved_at  TIMESTAMPTZ,
  cause        TEXT NOT NULL DEFAULT '',
  in_window    BOOLEAN NOT NULL DEFAULT false
);

-- Planned maintenance windows (alerts are muted inside them) and the maintenance log.
CREATE TABLE IF NOT EXISTS maintenance (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL,            -- window | log
  title       TEXT NOT NULL,
  notes       TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'general',
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at     TIMESTAMPTZ,
  user_id     INT REFERENCES users(id),
  auto        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WordPress core, theme and plugin state, as reported by the connector plugin.
CREATE TABLE IF NOT EXISTS wp_snapshots (
  id    SERIAL PRIMARY KEY,
  at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  data  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id       SERIAL PRIMARY KEY,
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel  TEXT NOT NULL,
  subject  TEXT NOT NULL,
  body     TEXT NOT NULL DEFAULT '',
  ok       BOOLEAN NOT NULL,
  error    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);
