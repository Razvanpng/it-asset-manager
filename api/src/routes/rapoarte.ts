import { Router, Request, Response } from 'express';
import moment from 'moment';
import db from '../db/connection';

const router = Router();

// 1. inventar echipamente pe angajat
router.get('/inventar-angajat', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT
      a.id as angajat_id,
      a.nume,
      a.prenume,
      a.email,
      a.departament,
      COUNT(e.id) as total_echipamente,
      GROUP_CONCAT(e.denumire, ', ') as echipamente
    FROM angajati a
    LEFT JOIN echipamente e ON e.proprietar_curent_id = a.id AND e.status != 'casat'
    WHERE a.activ = 1
    GROUP BY a.id
    ORDER BY a.nume, a.prenume
  `).all();
  res.json(rows);
});

// 2. inventar echipamente in magazie
router.get('/inventar-magazie', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT
      m.id as magazie_id,
      m.nume as magazie_nume,
      m.locatie,
      COUNT(e.id) as total_echipamente,
      GROUP_CONCAT(e.denumire, ', ') as echipamente
    FROM magazii m
    LEFT JOIN echipamente e ON e.magazie_id = m.id AND e.status != 'casat'
    WHERE m.activa = 1
    GROUP BY m.id
    ORDER BY m.nume
  `).all();
  res.json(rows);
});

// 3. istoric miscari pe echipament
router.get('/istoric/:echipament_id', (req: Request, res: Response) => {
  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.echipament_id);
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  const operatiuni = db.prepare(`
    SELECT
      o.*,
      a_src.nume || ' ' || a_src.prenume as angajat_sursa_nume,
      a_dst.nume || ' ' || a_dst.prenume as angajat_destinatie_nume,
      m_src.nume as magazie_sursa_nume,
      m_dst.nume as magazie_destinatie_nume
    FROM operatiuni o
    LEFT JOIN angajati a_src ON o.angajat_sursa_id = a_src.id
    LEFT JOIN angajati a_dst ON o.angajat_destinatie_id = a_dst.id
    LEFT JOIN magazii m_src ON o.magazie_sursa_id = m_src.id
    LEFT JOIN magazii m_dst ON o.magazie_destinatie_id = m_dst.id
    WHERE o.echipament_id = ?
    ORDER BY o.created_at DESC
  `).all(req.params.echipament_id);

  res.json({ echipament, operatiuni });
});

// 4. echipamente eligibile la casare (vechime >= 5 ani)
router.get('/eligibile-casare', (_req: Request, res: Response) => {
  const toate = db.prepare(`
    SELECT e.*, a.nume, a.prenume, m.nume as magazie_nume
    FROM echipamente e
    LEFT JOIN angajati a ON e.proprietar_curent_id = a.id
    LEFT JOIN magazii m ON e.magazie_id = m.id
    WHERE e.status != 'casat'
  `).all() as any[];

  const limita = moment().subtract(5, 'years');

  const eligibile = toate
    .filter(e => moment(e.data_achizitie).isBefore(limita))
    .map(e => ({
      ...e,
      vechime_ani: moment().diff(moment(e.data_achizitie), 'years')
    }));

  res.json({ total: eligibile.length, echipamente: eligibile });
});

// 5. operatiuni in curs
router.get('/operatiuni-in-curs', (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT
      o.*,
      e.serial,
      e.denumire,
      a_src.nume || ' ' || a_src.prenume as angajat_sursa_nume,
      a_dst.nume || ' ' || a_dst.prenume as angajat_destinatie_nume,
      m_src.nume as magazie_sursa_nume,
      m_dst.nume as magazie_destinatie_nume
    FROM operatiuni o
    JOIN echipamente e ON o.echipament_id = e.id
    LEFT JOIN angajati a_src ON o.angajat_sursa_id = a_src.id
    LEFT JOIN angajati a_dst ON o.angajat_destinatie_id = a_dst.id
    LEFT JOIN magazii m_src ON o.magazie_sursa_id = m_src.id
    LEFT JOIN magazii m_dst ON o.magazie_destinatie_id = m_dst.id
    WHERE o.status = 'in_curs'
    ORDER BY o.created_at DESC
  `).all();

  res.json({ total: rows.length, operatiuni: rows });
});

export default router;