import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import db from '../db/connection';

const router = Router();

// generare qr pentru echipament
router.post('/generare/:echipament_id', (req: Request, res: Response) => {
  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  const existing = db.prepare('SELECT * FROM qr_tokens WHERE echipament_id = ?').get(req.params.echipament_id) as any;
  if (existing && existing.activ) {
    return res.status(409).json({ error: 'echipamentul are deja un qr activ, foloseste regenerare' });
  }

  const token = uuidv4();

  db.prepare(`
    INSERT INTO qr_tokens (id, echipament_id, token, activ)
    VALUES (?, ?, ?, 1)
  `).run(uuidv4(), req.params.echipament_id, token);

  const url = `${req.protocol}://${req.get('host')}/api/qr/rezolvare/${token}`;

  QRCode.toDataURL(url, (_err: Error | null | undefined, dataUrl: string) => {
    res.json({ token, url, qr: dataUrl });
  });
});

// regenerare qr (invalideaza tokenul vechi)
router.post('/regenerare/:echipament_id', (req: Request, res: Response) => {
  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  // invalidate old token
  db.prepare(`
    UPDATE qr_tokens SET activ = 0 WHERE echipament_id = ?
  `).run(req.params.echipament_id);

  const token = uuidv4();

  db.prepare(`
    INSERT INTO qr_tokens (id, echipament_id, token, activ)
    VALUES (?, ?, ?, 1)
  `).run(uuidv4(), req.params.echipament_id, token);

  const url = `${req.protocol}://${req.get('host')}/api/qr/rezolvare/${token}`;

  QRCode.toDataURL(url, (_err: Error | null | undefined, dataUrl: string) => {
    res.json({ token, url, qr: dataUrl });
  });
});

// rezolvare token -> date echipament
router.get('/rezolvare/:token', (req: Request, res: Response) => {
  const qr = db.prepare(`
    SELECT * FROM qr_tokens WHERE token = ? AND activ = 1
  `).get(req.params.token) as any;

  if (!qr) return res.status(404).json({ error: 'token invalid sau expirat' });

  const echipament = db.prepare(`
    SELECT e.*, a.nume, a.prenume, a.email, m.nume as magazie_nume
    FROM echipamente e
    LEFT JOIN angajati a ON e.proprietar_curent_id = a.id
    LEFT JOIN magazii m ON e.magazie_id = m.id
    WHERE e.id = ?
  `).get(qr.echipament_id);

  res.json(echipament);
});

export default router;