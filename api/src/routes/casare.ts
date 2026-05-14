import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
import db from '../db/connection';

const router = Router();

const VECHIME_MINIMA_ANI = 5;

// casare echipament
router.post('/:echipament_id', (req: Request, res: Response) => {
  const echipament = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(req.params.echipament_id) as any;
  if (!echipament) return res.status(404).json({ error: 'echipament negasit' });

  if (echipament.status === 'casat') {
    return res.status(409).json({ error: 'echipamentul este deja casat' });
  }

  if (['in_curs_de_transfer', 'in_service'].includes(echipament.status)) {
    return res.status(409).json({ error: `echipamentul are status ${echipament.status}, nu poate fi casat` });
  }

  const dataAchizitie = moment(echipament.data_achizitie);
  const acum = moment();
  const vechimeAni = acum.diff(dataAchizitie, 'years');

  if (vechimeAni < VECHIME_MINIMA_ANI) {
    const eligibil_la = dataAchizitie.add(VECHIME_MINIMA_ANI, 'years').format('YYYY-MM-DD');
    return res.status(409).json({
      error: `echipamentul nu are vechimea minima de ${VECHIME_MINIMA_ANI} ani`,
      vechime_actuala_ani: vechimeAni,
      eligibil_la
    });
  }

  const { initiat_de, observatii } = req.body;

  const execute = db.transaction(() => {
    const opId = uuidv4();
    db.prepare(`
      INSERT INTO operatiuni (id, echipament_id, tip, status, angajat_sursa_id, magazie_sursa_id, initiat_de, observatii, finalizat_at)
      VALUES (?, ?, 'casare', 'finalizat', ?, ?, ?, ?, datetime('now'))
    `).run(
      opId,
      echipament.id,
      echipament.proprietar_curent_id ?? null,
      echipament.magazie_id ?? null,
      initiat_de ?? null,
      observatii ?? null
    );

    db.prepare(`
      UPDATE echipamente
      SET status = 'casat', proprietar_curent_id = NULL, magazie_id = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(echipament.id);
  });

  execute();

  const updated = db.prepare('SELECT * FROM echipamente WHERE id = ?').get(echipament.id);
  res.json({ message: 'echipament casat cu succes', echipament: updated });
});

export default router;