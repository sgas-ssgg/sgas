/* ================================================================
   SGAS — database.js
   PostgreSQL con Supabase (datos persistentes)
   ================================================================ */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ── Crear tablas si no existen ── */
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ats (
      id            SERIAL PRIMARY KEY,
      nombre        TEXT    NOT NULL,
      categoria     TEXT    NOT NULL,
      estado        TEXT    NOT NULL DEFAULT 'borrador',
      filas         TEXT    NOT NULL DEFAULT '[]',
      observaciones TEXT    NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS emergencias (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      extintores  TEXT    NOT NULL DEFAULT '[]',
      duchas      TEXT    NOT NULL DEFAULT '[]',
      alarmas     TEXT    NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      fecha       TEXT    NOT NULL,
      base64      TEXT    NOT NULL,
      mime_type   TEXT    NOT NULL DEFAULT 'application/pdf',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      key         TEXT    PRIMARY KEY,
      value       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL UNIQUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ats_categoria  ON ats(categoria);
    CREATE INDEX IF NOT EXISTS idx_ats_updated_at ON ats(updated_at DESC);

    -- Agregar columna tipo si no existe (sin tocar datos existentes)
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ats';
    ALTER TABLE categorias ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ats';
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS emergencia TEXT NOT NULL DEFAULT '{}';

    -- Nuevos campos: código de ficha y tabla OT/TAG
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS codigo   TEXT    NOT NULL DEFAULT '';
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS ot_tags  TEXT    NOT NULL DEFAULT '[]';

    -- Campo favorito para marcar fichas importantes
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS favorito BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_ats_tipo ON ats(tipo);

    -- Constraint única por nombre+tipo en categorías (para upsert correcto)
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categorias_nombre_tipo_key'
      ) THEN
        ALTER TABLE categorias ADD CONSTRAINT categorias_nombre_tipo_key UNIQUE (nombre, tipo);
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS sheets (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      url         TEXT    NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      fecha       TEXT    NOT NULL,
      base64      TEXT    NOT NULL,
      mime_type   TEXT    NOT NULL DEFAULT 'application/pdf',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Agregar columna categoria a checklists (sin tocar registros existentes → quedan en 'General')
    ALTER TABLE checklists ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'General';

    CREATE INDEX IF NOT EXISTS idx_checklists_categoria ON checklists(categoria);

    -- Eliminar constraint único solo por nombre (legacy) para permitir mismo nombre en distintos tipos
    ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nombre_key;
  `);
  console.log('Base de datos inicializada');
}

module.exports = { pool, init };
