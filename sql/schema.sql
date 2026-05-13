PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS angajati (
  id TEXT PRIMARY KEY,
  nume TEXT NOT NULL,
  prenume TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  departament TEXT,
  activ INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS magazii (
  id TEXT PRIMARY KEY,
  nume TEXT NOT NULL,
  locatie TEXT,
  activa INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS echipamente (
  id TEXT PRIMARY KEY,
  serial TEXT UNIQUE NOT NULL,
  denumire TEXT NOT NULL,
  tip TEXT NOT NULL,
  producator TEXT,
  model TEXT,
  data_achizitie TEXT NOT NULL,
  valoare REAL,
  status TEXT NOT NULL DEFAULT 'disponibil',
  proprietar_curent_id TEXT,
  magazie_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (proprietar_curent_id) REFERENCES angajati(id),
  FOREIGN KEY (magazie_id) REFERENCES magazii(id)
);

CREATE TABLE IF NOT EXISTS componente_echipamente (
  id TEXT PRIMARY KEY,
  echipament_id TEXT NOT NULL,
  tip TEXT NOT NULL,
  descriere TEXT,
  serial_componenta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (echipament_id) REFERENCES echipamente(id)
);

CREATE TABLE IF NOT EXISTS operatiuni (
  id TEXT PRIMARY KEY,
  echipament_id TEXT NOT NULL,
  tip TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_curs',
  angajat_sursa_id TEXT,
  angajat_destinatie_id TEXT,
  magazie_sursa_id TEXT,
  magazie_destinatie_id TEXT,
  initiat_de TEXT,
  observatii TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finalizat_at TEXT,
  FOREIGN KEY (echipament_id) REFERENCES echipamente(id),
  FOREIGN KEY (angajat_sursa_id) REFERENCES angajati(id),
  FOREIGN KEY (angajat_destinatie_id) REFERENCES angajati(id),
  FOREIGN KEY (magazie_sursa_id) REFERENCES magazii(id),
  FOREIGN KEY (magazie_destinatie_id) REFERENCES magazii(id)
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  id TEXT PRIMARY KEY,
  echipament_id TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  activ INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (echipament_id) REFERENCES echipamente(id)
);