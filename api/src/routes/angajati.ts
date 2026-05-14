import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';

const router = Router();

// list all
router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM angajati ORDER BY nume, prenume').all();
  res.json(rows);
});

// get one
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM angajati WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'angajat negasit' });
  res.json(row);
});

// create
router.post('/', (req: Request, res: Response) => {
  const { nume, prenume, email, departament } = req.body;

  if (!nume || !prenume || !email) {
    return res.status(400).json({ error: 'nume, prenume si email sunt obligatorii' });
  }

  const existing = db.prepare('SELECT id FROM angajati WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'email deja folosit' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO angajati (id, nume, prenume, email, departament)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nume, prenume, email, departament ?? null);

  const created = db.prepare('SELECT * FROM angajati WHERE id = ?').get(id);
  res.status(201).json(created);
});

// update
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM angajati WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'angajat negasit' });

  const { nume, prenume, email, departament, activ } = req.body;

  db.prepare(`
    UPDATE angajati
    SET nume = COALESCE(?, nume),
        prenume = COALESCE(?, prenume),
        email = COALESCE(?, email),
        departament = COALESCE(?, departament),
        activ = COALESCE(?, activ),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    nume ?? null,
    prenume ?? null,
    email ?? null,
    departament ?? null,
    activ ?? null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM angajati WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// delete (soft delete)
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM angajati WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'angajat negasit' });

  // check if has active equipment
  const hasEquipment = db.prepare(`
    SELECT id FROM echipamente
    WHERE proprietar_curent_id = ? AND status != 'casat'
  `).get(req.params.id);

  if (hasEquipment) {
    return res.status(409).json({ error: 'angajatul are echipamente active, realoca-le inainte' });
  }

  db.prepare(`
    UPDATE angajati SET activ = 0, updated_at = datetime('now') WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'angajat dezactivat' });
});

export default router;