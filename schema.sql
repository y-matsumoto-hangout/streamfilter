CREATE TABLE IF NOT EXISTS ranking_daily (
  video_id    TEXT    NOT NULL,
  service     TEXT    NOT NULL,
  period      TEXT    NOT NULL,
  country     TEXT    NOT NULL,
  play_count  INTEGER NOT NULL DEFAULT 0,
  total_secs  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL,
  PRIMARY KEY (video_id, service, period, country)
);

CREATE TABLE IF NOT EXISTS video_meta (
  video_id    TEXT NOT NULL,
  service     TEXT NOT NULL,
  title       TEXT,
  thumbnail   TEXT,
  author      TEXT,
  fetched_at  TEXT NOT NULL,
  PRIMARY KEY (video_id, service)
);

CREATE INDEX IF NOT EXISTS idx_ranking_plays
  ON ranking_daily(period, country, service, play_count DESC);

CREATE INDEX IF NOT EXISTS idx_ranking_secs
  ON ranking_daily(period, country, service, total_secs DESC);
