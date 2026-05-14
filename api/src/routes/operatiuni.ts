import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';

const router = Router();

const BLOCKED_STATUSES = ['defect', 'in_service', 'casat', 'in_curs_de_transfer'];

// list operatiuni (optional filter by echipament_id or status)
router.get('/', (req: Request, res: Response) => {
  const { echipament_id, status } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (echipament_id) { conditions.push('echipament_id = ?'); params.push(echipament_id); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM operatiuni ${where} ORDER BY created_at DESC`).all(...params);
  res.json(rows);
});

// get one
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'operatiune negasita' });
  res.json(row);
});

// initiere alocare echipament -> angajat
router.post('/alocare', (req: Request, res: Response) => {
  const { echipament_id, angajat_destinatie_id, initiat_de, observatii } = req.body;

  if (!echipament_id || !angajat_destinatie_id) {
    return res.status(400).json({ error: 'echipament_id si angajat_destinatie_id sunt obligatorii' });
  }

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (BLOCKED_STATUSES.includes(echipament.status)) {
    return res.status(409).json({ error: `echipamentul are status ${echipament.status}, nu poate fi alocat` });
  }

  if (echipament.proprietar_curent_id) {
    return res.status(409).json({ error: 'echipamentul este deja alocat unui angajat, foloseste mutare' });
  }

  const opActiva = db.prepare(`
    SELECT id FROM operatiuni WHERE echipament_id = ? AND status = 'in_curs'
  `).get(echipament_id);
  if (opActiva) return res.status(409).json({ error: 'echipamentul are deja o operatiune activa' });

  const angajat = db.prepare('SELECT id FROM angajati WHERE id = ? AND activ = 1').get(angajat_destinatie_id);
  if (!angajat) return res.status(404).json({ error: 'angajat negasit sau inactiv' });

  const id = uuidv4();

  const finalize = db.transaction(() => {
    db.prepare(`
      INSERT INTO operatiuni (id, echipament_id, tip, status, magazie_sursa_id, angajat_destinatie_id, initiat_de, observatii)
      VALUES (?, ?, 'alocare', 'in_curs', ?, ?, ?, ?)
    `).run(id, echipament_id, echipament.magazie_id ?? null, angajat_destinatie_id, initiat_de ?? null, observatii ?? null);

    db.prepare(`
      UPDATE echipamente SET status = 'in_curs_de_transfer', updated_at = datetime('now') WHERE id = ?
    `).run(echipament_id);
  });

  finalize();

  const created = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(id);
  res.status(201).json(created);
});

// initiere mutare angajat -> angajat
router.post('/mutare-angajat', (req: Request, res: Response) => {
  const { echipament_id, angajat_destinatie_id, initiat_de, observatii } = req.body;

  if (!echipament_id || !angajat_destinatie_id) {
    return res.status(400).json({ error: 'echipament_id si angajat_destinatie_id sunt obligatorii' });
  }

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (BLOCKED_STATUSES.includes(echipament.status)) {
    return res.status(409).json({ error: `echipamentul are status ${echipament.status}, nu poate fi mutat` });
  }

  if (!echipament.proprietar_curent_id) {
    return res.status(409).json({ error: 'echipamentul nu este alocat niciunui angajat' });
  }

  if (echipament.proprietar_curent_id === angajat_destinatie_id) {
    return res.status(409).json({ error: 'echipamentul este deja la acest angajat' });
  }

  const opActiva = db.prepare(`
    SELECT id FROM operatiuni WHERE echipament_id = ? AND status = 'in_curs'
  `).get(echipament_id);
  if (opActiva) return res.status(409).json({ error: 'echipamentul are deja o operatiune activa' });

  const angajat = db.prepare('SELECT id FROM angajati WHERE id = ? AND activ = 1').get(angajat_destinatie_id);
  if (!angajat) return res.status(404).json({ error: 'angajat destinatie negasit sau inactiv' });

  const id = uuidv4();

  const execute = db.transaction(() => {
    db.prepare(`
      INSERT INTO operatiuni (id, echipament_id, tip, status, angajat_sursa_id, angajat_destinatie_id, initiat_de, observatii)
      VALUES (?, ?, 'mutare_angajat', 'in_curs', ?, ?, ?, ?)
    `).run(id, echipament_id, echipament.proprietar_curent_id, angajat_destinatie_id, initiat_de ?? null, observatii ?? null);

    db.prepare(`
      UPDATE echipamente SET status = 'in_curs_de_transfer', updated_at = datetime('now') WHERE id = ?
    `).run(echipament_id);
  });

  execute();

  const created = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(id);
  res.status(201).json(created);
});

// initiere mutare angajat -> magazie
router.post('/returnare-magazie', (req: Request, res: Response) => {
  const { echipament_id, magazie_destinatie_id, initiat_de, observatii } = req.body;

  if (!echipament_id || !magazie_destinatie_id) {
    return res.status(400).json({ error: 'echipament_id si magazie_destinatie_id sunt obligatorii' });
  }

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (BLOCKED_STATUSES.includes(echipament.status)) {
    return res.status(409).json({ error: `echipamentul are status ${echipament.status}, nu poate fi returnat` });
  }

  if (!echipament.proprietar_curent_id) {
    return res.status(409).json({ error: 'echipamentul nu este alocat niciunui angajat' });
  }

  const opActiva = db.prepare(`
    SELECT id FROM operatiuni WHERE echipament_id = ? AND status = 'in_curs'
  `).get(echipament_id);
  if (opActiva) return res.status(409).json({ error: 'echipamentul are deja o operatiune activa' });

  const magazie = db.prepare('SELECT id FROM magazii WHERE id = ? AND activa = 1').get(magazie_destinatie_id);
  if (!magazie) return res.status(404).json({ error: 'magazie negasita sau inactiva' });

  const id = uuidv4();

  const execute = db.transaction(() => {
    db.prepare(`
      INSERT INTO operatiuni (id, echipament_id, tip, status, angajat_sursa_id, magazie_destinatie_id, initiat_de, observatii)
      VALUES (?, ?, 'returnare_magazie', 'in_curs', ?, ?, ?, ?)
    `).run(id, echipament_id, echipament.proprietar_curent_id, magazie_destinatie_id, initiat_de ?? null, observatii ?? null);

    db.prepare(`
      UPDATE echipamente SET status = 'in_curs_de_transfer', updated_at = datetime('now') WHERE id = ?
    `).run(echipament_id);
  });

  execute();

  const created = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(id);
  res.status(201).json(created);
});

// initiere mutare magazie -> angajat
router.post('/alocare-din-magazie', (req: Request, res: Response) => {
  const { echipament_id, angajat_destinatie_id, initiat_de, observatii } = req.body;

  if (!echipament_id || !angajat_destinatie_id) {
    return res.status(400).json({ error: 'echipament_id si angajat_destinatie_id sunt obligatorii' });
  }

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (BLOCKED_STATUSES.includes(echipament.status)) {
    return res.status(409).json({ error: `echipamentul are status ${echipament.status}, nu poate fi alocat` });
  }

  if (!echipament.magazie_id) {
    return res.status(409).json({ error: 'echipamentul nu se afla in nicio magazie' });
  }

  if (echipament.proprietar_curent_id) {
    return res.status(409).json({ error: 'echipamentul este deja la un angajat' });
  }

  const opActiva = db.prepare(`
    SELECT id FROM operatiuni WHERE echipament_id = ? AND status = 'in_curs'
  `).get(echipament_id);
  if (opActiva) return res.status(409).json({ error: 'echipamentul are deja o operatiune activa' });

  const angajat = db.prepare('SELECT id FROM angajati WHERE id = ? AND activ = 1').get(angajat_destinatie_id);
  if (!angajat) return res.status(404).json({ error: 'angajat negasit sau inactiv' });

  const id = uuidv4();

  const execute = db.transaction(() => {
    db.prepare(`
      INSERT INTO operatiuni (id, echipament_id, tip, status, magazie_sursa_id, angajat_destinatie_id, initiat_de, observatii)
      VALUES (?, ?, 'alocare_din_magazie', 'in_curs', ?, ?, ?, ?)
    `).run(id, echipament_id, echipament.magazie_id, angajat_destinatie_id, initiat_de ?? null, observatii ?? null);

    db.prepare(`
      UPDATE echipamente SET status = 'in_curs_de_transfer', updated_at = datetime('now') WHERE id = ?
    `).run(echipament_id);
  });

  execute();

  const created = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(id);
  res.status(201).json(created);
});

// finalizare operatiune
router.patch('/:id/finalizare', (req: Request, res: Response) => {
  const op = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(req.params.id) as any;
  if (!op) return res.status(404).json({ error: 'operatiune negasita' });

  if (op.status !== 'in_curs') {
    return res.status(409).json({ error: 'operatiunea nu este in curs' });
  }

  const execute = db.transaction(() => {
    if (op.tip === 'alocare') {
      db.prepare(`
        UPDATE echipamente
        SET proprietar_curent_id = ?, magazie_id = NULL, status = 'alocat', updated_at = datetime('now')
        WHERE id = ?
      `).run(op.angajat_destinatie_id, op.echipament_id);
    }

    if (op.tip === 'mutare_angajat') {
      db.prepare(`
        UPDATE echipamente
        SET proprietar_curent_id = ?, status = 'alocat', updated_at = datetime('now')
        WHERE id = ?
      `).run(op.angajat_destinatie_id, op.echipament_id);
    }

    if (op.tip === 'returnare_magazie') {
      db.prepare(`
        UPDATE echipamente
        SET proprietar_curent_id = NULL, magazie_id = ?, status = 'disponibil', updated_at = datetime('now')
        WHERE id = ?
      `).run(op.magazie_destinatie_id, op.echipament_id);
    }

    if (op.tip === 'alocare_din_magazie') {
      db.prepare(`
        UPDATE echipamente
        SET proprietar_curent_id = ?, magazie_id = NULL, status = 'alocat', updated_at = datetime('now')
        WHERE id = ?
      `).run(op.angajat_destinatie_id, op.echipament_id);
    }

    db.prepare(`
      UPDATE operatiuni
      SET status = 'finalizat', finalizat_at = datetime('now')
      WHERE id = ?
    `).run(op.id);
  });

  execute();

  const updated = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(op.id);
  res.json(updated);
});

// anulare operatiune
router.patch('/:id/anulare', (req: Request, res: Response) => {
  const op = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(req.params.id) as any;
  if (!op) return res.status(404).json({ error: 'operatiune negasita' });

  if (op.status !== 'in_curs') {
    return res.status(409).json({ error: 'operatiunea nu este in curs' });
  }

  const execute = db.transaction(() => {
    // restore previous status
    const prevStatus = op.angajat_sursa_id || op.proprietar_curent_id ? 'alocat' : 'disponibil';
    db.prepare(`
      UPDATE echipamente SET status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(prevStatus, op.echipament_id);

    db.prepare(`
      UPDATE operatiuni SET status = 'anulat', finalizat_at = datetime('now') WHERE id = ?
    `).run(op.id);
  });

  execute();

  const updated = db.prepare('SELECT * FROM operatiuni WHERE id = ?').get(op.id);
  res.json(updated);
});

export default router;