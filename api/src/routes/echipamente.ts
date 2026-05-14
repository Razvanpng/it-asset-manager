import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection';

const router = Router();

// list with filter, pagination, sort
router.get('/', (req: Request, res: Response) => {
  const {
    status,
    tip,
    proprietar_curent_id,
    magazie_id,
    page = '1',
    limit = '20',
    sort = 'created_at',
    order = 'desc'
  } = req.query as Record<string, string>;

  const allowed_sort = ['denumire', 'serial', 'tip', 'status', 'data_achizitie', 'created_at'];
  const sort_col = allowed_sort.includes(sort) ? sort : 'created_at';
  const sort_order = order === 'asc' ? 'ASC' : 'DESC';

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (tip) { conditions.push('tip = ?'); params.push(tip); }
  if (proprietar_curent_id) { conditions.push('proprietar_curent_id = ?'); params.push(proprietar_curent_id); }
  if (magazie_id) { conditions.push('magazie_id = ?'); params.push(magazie_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM echipamente ${where}`).get(...params) as { cnt: number }).cnt;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);

  const rows = db.prepare(`
    SELECT * FROM echipamente ${where}
    ORDER BY ${sort_col} ${sort_order}
    LIMIT ? OFFSET ?
  `).all(...params);

  res.json({
    data: rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// get one
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'echipament negasit' });
  res.json(row);
});

// create
router.post('/', (req: Request, res: Response) => {
  const { serial, denumire, tip, producator, model, data_achizitie, valoare, magazie_id } = req.body;

  if (!serial || !denumire || !tip || !data_achizitie) {
    return res.status(400).json({ error: 'serial, denumire, tip si data_achizitie sunt obligatorii' });
  }

  const existing = db.prepare('SELECT id FROM echipamente WHERE serial = ?').get(serial);
  if (existing) return res.status(409).json({ error: 'serial deja existent' });

  if (magazie_id) {
    const mag = db.prepare('SELECT id FROM magazii WHERE id = ?').get(magazie_id);
    if (!mag) return res.status(400).json({ error: 'magazie inexistenta' });
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO echipamente (id, serial, denumire, tip, producator, model, data_achizitie, valoare, magazie_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, serial, denumire, tip, producator ?? null, model ?? null, data_achizitie, valoare ?? null, magazie_id ?? null);

  const created = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(id);
  res.status(201).json(created);
});

// update
router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'echipament negasit' });

  if (existing.status === 'casat') {
    return res.status(409).json({ error: 'echipamentul este casat, nu poate fi modificat' });
  }

  const { denumire, tip, producator, model, data_achizitie, valoare } = req.body;

  db.prepare(`
    UPDATE echipamente
    SET denumire = COALESCE(?, denumire),
        tip = COALESCE(?, tip),
        producator = COALESCE(?, producator),
        model = COALESCE(?, model),
        data_achizitie = COALESCE(?, data_achizitie),
        valoare = COALESCE(?, valoare),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    denumire ?? null,
    tip ?? null,
    producator ?? null,
    model ?? null,
    data_achizitie ?? null,
    valoare ?? null,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// delete (only if disponibil and no operatiuni active)
router.delete('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'echipament negasit' });

  if (existing.status !== 'disponibil') {
    return res.status(409).json({ error: 'doar echipamentele cu status disponibil pot fi sterse' });
  }

  const opActiva = db.prepare(`
    SELECT id FROM operatiuni WHERE echipament_id = ? AND status = 'in_curs'
  `).get(req.params.id);

  if (opActiva) {
    return res.status(409).json({ error: 'echipamentul are o operatiune activa' });
  }

  db.prepare('DELETE FROM echipamente WHERE id = ?').run(req.params.id);
  res.json({ message: 'echipament sters' });
});

export default router;