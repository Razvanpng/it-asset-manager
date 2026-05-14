import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';

const router = Router();

// list all (optional filter by echipament_id)
router.get('/', (req: Request, res: Response) => {
  const { echipament_id } = req.query as Record<string, string>;

  if (echipament_id) {
    const rows = db.prepare(`
      SELECT * FROM componente_echipamente WHERE echipament_id = ? ORDER BY created_at DESC
    `).all(echipament_id);
    return res.json(rows);
  }

  const rows = db.prepare('SELECT * FROM componente_echipamente ORDER BY created_at DESC').all();
  res.json(rows);
});

// get one
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'componenta negasita' });
  res.json(row);
});

// create + asociere la echipament
router.post('/', (req: Request, res: Response) => {
  const { echipament_id, tip, descriere, serial_componenta } = req.body;

  if (!echipament_id || !tip) {
    return res.status(400).json({ error: 'echipament_id si tip sunt obligatorii' });
  }

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (echipament.status === 'casat') {
    return res.status(409).json({ error: 'nu se pot adauga componente la un echipament casat' });
  }

  if (serial_componenta) {
    const existing = db.prepare(`
      SELECT id FROM componente_echipamente WHERE serial_componenta = ?
    `).get(serial_componenta);
    if (existing) return res.status(409).json({ error: 'serial componenta deja existent' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO componente_echipamente (id, echipament_id, tip, descriere, serial_componenta)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, echipament_id, tip, descriere ?? null, serial_componenta ?? null);

  const created = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(id);
  res.status(201).json(created);
});

// update
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'componenta negasita' });

  const { tip, descriere, serial_componenta } = req.body;

  db.prepare(`
    UPDATE componente_echipamente
    SET tip = COALESCE(?, tip),
        descriere = COALESCE(?, descriere),
        serial_componenta = COALESCE(?, serial_componenta)
    WHERE id = ?
  `).run(tip ?? null, descriere ?? null, serial_componenta ?? null, req.params.id);

  const updated = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// delete
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'componenta negasita' });

  db.prepare('DELETE FROM componente_echipamente WHERE id = ?').run(req.params.id);
  res.json({ message: 'componenta stearsa' });
});

// asociere componenta la alt echipament
router.patch('/:id/asociere', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'componenta negasita' });

  const { echipament_id } = req.body;
  if (!echipament_id) return res.status(400).json({ error: 'echipament_id este obligatoriu' });

  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (echipament.status === 'casat') {
    return res.status(409).json({ error: 'nu se poate asocia componenta la un echipament casat' });
  }

  db.prepare(`
    UPDATE componente_echipamente SET echipament_id = ? WHERE id = ?
  `).run(echipament_id, req.params.id);

  const updated = db.prepare('SELECT * FROM componente_echipamente WHERE id = ?').get(req.params.id);
  res.json(updated);
});

export default router;