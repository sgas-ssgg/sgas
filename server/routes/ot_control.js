/* ================================================================
   SGAS — routes/ot_control.js
   Control de Órdenes de Trabajo para Parada de Planta
   ================================================================ */
const express      = require('express');
const router       = express.Router();
const { pool }     = require('../database');
const { validarId } = require('./helpers');

// GET / — todas las OTs
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ot_control ORDER BY orden ASC'
    );
    res.json(result.rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST / — agregar una OT individual
router.post('/', async (req, res) => {
  try {
    const { orden, descripcion, tag, area, proceso } = req.body;
    if (!orden) return res.status(400).json({ error: 'orden requerido' });
    const result = await pool.query(
      `INSERT INTO ot_control (orden, descripcion, tag, area, proceso)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (orden) DO UPDATE SET
         descripcion = EXCLUDED.descripcion,
         tag         = EXCLUDED.tag,
         area        = EXCLUDED.area,
         proceso     = EXCLUDED.proceso
       RETURNING *`,
      [orden.trim(), descripcion||'', tag||'', area||'', proceso||'']
    );
    res.status(201).json(result.rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /bulk — carga masiva desde Excel
router.post('/bulk', async (req, res) => {
  try {
    const { ots } = req.body; // array de { orden, descripcion, tag, area, proceso }
    if (!Array.isArray(ots) || ots.length === 0)
      return res.status(400).json({ error: 'Se esperaba array ots' });

    let insertadas = 0;
    for (const ot of ots) {
      if (!ot.orden) continue;
      await pool.query(
        `INSERT INTO ot_control (orden, descripcion, tag, area, proceso)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (orden) DO UPDATE SET
           descripcion = EXCLUDED.descripcion,
           tag         = EXCLUDED.tag,
           area        = EXCLUDED.area,
           proceso     = EXCLUDED.proceso`,
        [ot.orden.trim(), ot.descripcion||'', ot.tag||'', ot.area||'', ot.proceso||'']
      );
      insertadas++;
    }
    res.json({ ok: true, insertadas });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id — eliminar una OT
router.delete('/:id', async (req, res) => {
  if (!validarId(req, res)) return;
  try {
    const result = await pool.query(
      'DELETE FROM ot_control WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
