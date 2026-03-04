const db = require("../DB/db");

const PROMEDIO_MIN = 15;
const TIEMPO_ATENCION_SEG = 180;

// ===============================
// TABLAS
// ===============================
db.run(`
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT NOT NULL UNIQUE,
    tramite TEXT NOT NULL,
    correo TEXT,
    estado TEXT NOT NULL DEFAULT 'EN_ESPERA',
    creado_en INTEGER NOT NULL,
    atendido_en INTEGER,
    cancelado_en INTEGER
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tramites_estado (
    tramite TEXT PRIMARY KEY,
    turno_actual_id INTEGER,
    actualizado_en INTEGER NOT NULL
  )
`);

// ✅ Para "poner en espera" (mover al final)
db.run("ALTER TABLE turnos ADD COLUMN orden INTEGER", () => {});
db.run("ALTER TABLE turnos ADD COLUMN atendido_fin INTEGER", () => {}); // opcional, por si luego lo usas

const pad3 = (n) => String(n).padStart(3, "0");
// Si quieres sin guion: `A${pad3(nextId)}`
const generarFolio = (nextId) => `A-${pad3(nextId)}`;

// ===============================
// HELPERS
// ===============================
function asegurarTramite(tramite, cb) {
  db.get(
    "SELECT tramite, turno_actual_id FROM tramites_estado WHERE tramite = ?",
    [tramite],
    (err, row) => {
      if (err) return cb(err);
      if (row) return cb(null, row);

      db.run(
        "INSERT INTO tramites_estado (tramite, turno_actual_id, actualizado_en) VALUES (?, NULL, ?)",
        [tramite, Date.now()],
        (insErr) => {
          if (insErr) return cb(insErr);
          cb(null, { tramite, turno_actual_id: null });
        },
      );
    },
  );
}

function avanzarAlSiguiente(tramite, cb) {
  db.get(
    `SELECT id, folio
     FROM turnos
     WHERE tramite = ? AND estado = 'EN_ESPERA'
     ORDER BY COALESCE(orden, id) ASC
     LIMIT 1`,
    [tramite],
    (err, nextRow) => {
      if (err) return cb(err);

      if (!nextRow) {
        db.run(
          "UPDATE tramites_estado SET turno_actual_id = NULL, actualizado_en = ? WHERE tramite = ?",
          [Date.now(), tramite],
          (upErr) => cb(upErr, null),
        );
        return;
      }

      db.run(
        "UPDATE turnos SET estado = 'EN_ATENCION', atendido_en = ? WHERE id = ?",
        [Date.now(), nextRow.id],
        (upErr) => {
          if (upErr) return cb(upErr);

          db.run(
            "UPDATE tramites_estado SET turno_actual_id = ?, actualizado_en = ? WHERE tramite = ?",
            [nextRow.id, Date.now(), tramite],
            (up2Err) => {
              if (up2Err) return cb(up2Err);
              cb(null, nextRow);
            },
          );
        },
      );
    },
  );
}

function asegurarTurnoActual(tramite, cb) {
  asegurarTramite(tramite, (err, st) => {
    if (err) return cb(err);

    if (st.turno_actual_id) {
      db.get(
        "SELECT id, folio, estado, atendido_en FROM turnos WHERE id = ?",
        [st.turno_actual_id],
        (e2, row) => {
          if (e2) return cb(e2);
          if (row && row.estado === "EN_ATENCION") return cb(null, row);
          return avanzarAlSiguiente(tramite, cb);
        },
      );
    } else {
      return avanzarAlSiguiente(tramite, cb);
    }
  });
}

// ===============================
// POST /turnos/crear  body: { tramite, correo? }
// ===============================
exports.crearTurno = (req, res) => {
  const tramite = (req.body.tramite || "").trim();
  const correo = (req.body.correo || "").trim().toLowerCase() || null;

  if (!tramite) {
    return res.status(400).json({ ok: false, error: "Falta trámite" });
  }

  db.get("SELECT id FROM turnos ORDER BY id DESC LIMIT 1", [], (err, last) => {
    if (err) return res.status(500).json({ ok: false, error: "DB error" });

    const nextId = (last?.id || 0) + 1;
    const folio = generarFolio(nextId);
    const creado_en = Date.now();

    db.run(
      `INSERT INTO turnos (folio, tramite, correo, estado, creado_en, orden)
       VALUES (?, ?, ?, 'EN_ESPERA', ?, ?)`,
      [folio, tramite, correo, creado_en, nextId],
      (insErr) => {
        if (insErr) {
          console.error(insErr);
          return res
            .status(500)
            .json({ ok: false, error: "No se pudo crear turno" });
        }

        asegurarTurnoActual(tramite, (e2) => {
          if (e2) console.error(e2);
          return res.json({ ok: true, folio, tramite });
        });
      },
    );
  });
};

// ===============================
// GET /turnos/estado?folio=A-001
// ===============================
exports.estadoTurno = (req, res) => {
  const folio = (req.query.folio || "").trim();
  if (!folio) return res.status(400).json({ ok: false });

  db.get(
    "SELECT id, folio, tramite, estado, creado_en, atendido_en FROM turnos WHERE folio = ?",
    [folio],
    (err, miTurno) => {
      if (err) return res.status(500).json({ ok: false });
      if (!miTurno) return res.status(404).json({ ok: false });

      asegurarTurnoActual(miTurno.tramite, (e2) => {
        if (e2) return res.status(500).json({ ok: false });

        // re-leer por si cambió a EN_ATENCION
        db.get(
          "SELECT id, folio, tramite, estado, atendido_en, orden FROM turnos WHERE folio = ?",
          [folio],
          (eReload, miTurno2) => {
            if (eReload) return res.status(500).json({ ok: false });
            miTurno = miTurno2 || miTurno;

            // próximos adelante = turnos antes que yo, en espera
            db.all(
              `SELECT folio
               FROM turnos
               WHERE tramite = ?
                 AND estado = 'EN_ESPERA'
                 AND COALESCE(orden, id) < COALESCE(?, ?)
               ORDER BY COALESCE(orden, id) DESC
               LIMIT 2`,
              [miTurno.tramite, miTurno.orden, miTurno.id],
              (e3, prevs) => {
                if (e3) return res.status(500).json({ ok: false });

                db.get(
                  `SELECT COUNT(*) as c
                   FROM turnos
                   WHERE tramite = ?
                     AND estado = 'EN_ESPERA'
                     AND COALESCE(orden, id) < COALESCE(?, ?)`,
                  [miTurno.tramite, miTurno.orden, miTurno.id],
                  (e4, countRow) => {
                    if (e4) return res.status(500).json({ ok: false });

                    const delante = countRow?.c || 0;
                    const estimadoSeg = delante * PROMEDIO_MIN * 60;

                    let restanteSeg = null;
                    if (miTurno.estado === "EN_ATENCION") {
                      const inicio = miTurno.atendido_en || Date.now();
                      const trans = Math.floor((Date.now() - inicio) / 1000);
                      restanteSeg = Math.max(0, TIEMPO_ATENCION_SEG - trans);
                    }

                    return res.json({
                      ok: true,
                      miTurno: {
                        folio: miTurno.folio,
                        tramite: miTurno.tramite,
                        estado: miTurno.estado,
                      },
                      proximos_adelante: (prevs || []).map((x) => x.folio),
                      estimadoSeg,
                      restanteSeg,
                    });
                  },
                );
              },
            );
          },
        );
      });
    },
  );
};

// ===============================
// POST /turnos/cancelar body: { folio }
// ===============================
exports.cancelarTurno = (req, res) => {
  const folio = (req.body.folio || "").trim();
  if (!folio) return res.status(400).json({ ok: false });

  db.get(
    "SELECT id, tramite FROM turnos WHERE folio = ?",
    [folio],
    (err, row) => {
      if (err || !row) return res.status(400).json({ ok: false });

      db.run(
        "UPDATE turnos SET estado = 'CANCELADO', cancelado_en = ? WHERE id = ?",
        [Date.now(), row.id],
        (upErr) => {
          if (upErr) return res.status(500).json({ ok: false });

          asegurarTramite(row.tramite, (e2, st) => {
            if (!e2 && st?.turno_actual_id === row.id) {
              avanzarAlSiguiente(row.tramite, (e3) => {
                if (e3) console.error(e3);
                return res.json({ ok: true });
              });
            } else {
              return res.json({ ok: true });
            }
          });
        },
      );
    },
  );
};

// ===============================
// POST /turnos/tick body: { tramite }
// - si el turno actual ya rebasó 3 min => CANCELADO + avanzar
// ===============================
exports.tick = (req, res) => {
  const tramite = (req.body.tramite || "").trim();
  if (!tramite) return res.json({ ok: true });

  asegurarTurnoActual(tramite, (err, actual) => {
    if (err) return res.status(500).json({ ok: false });
    if (!actual) return res.json({ ok: true });

    const inicio = actual.atendido_en || Date.now();
    const trans = Math.floor((Date.now() - inicio) / 1000);

    if (trans >= TIEMPO_ATENCION_SEG) {
      db.run(
        "UPDATE turnos SET estado = 'CANCELADO', cancelado_en = ? WHERE id = ?",
        [Date.now(), actual.id],
        (e2) => {
          if (e2) console.error(e2);
          avanzarAlSiguiente(tramite, (e3) => {
            if (e3) console.error(e3);
            return res.json({ ok: true, avanzado: true });
          });
        },
      );
    } else {
      return res.json({ ok: true, avanzado: false });
    }
  });
};

// ===================================================
// ✅ PANEL PERSONAL
// ===================================================

// GET /turnos/personal/cola?tramite=xxx
exports.colaPersonal = (req, res) => {
  const tramite = (req.query.tramite || "").trim();
  if (!tramite)
    return res.status(400).json({ ok: false, error: "Falta tramite" });

  // asegura que exista turno actual
  asegurarTurnoActual(tramite, (err) => {
    if (err) return res.status(500).json({ ok: false });

    db.get(
      `SELECT id, folio, correo
       FROM turnos
       WHERE tramite = ? AND estado = 'EN_ATENCION'
       ORDER BY COALESCE(orden, id) ASC
       LIMIT 1`,
      [tramite],
      (e1, actual) => {
        if (e1) return res.status(500).json({ ok: false });

        db.all(
          `SELECT id, folio, correo
           FROM turnos
           WHERE tramite = ? AND estado = 'EN_ESPERA'
           ORDER BY COALESCE(orden, id) ASC
           LIMIT 3`,
          [tramite],
          (e2, proximos) => {
            if (e2) return res.status(500).json({ ok: false });

            return res.json({
              ok: true,
              actual: actual || null,
              proximos: proximos || [],
            });
          },
        );
      },
    );
  });
};

// POST /turnos/personal/accion
// body: { tramite, accion }  accion: aceptar | rechazar | espera
exports.accionPersonal = (req, res) => {
  const tramite = (req.body.tramite || "").trim();
  const accion = (req.body.accion || "").trim();

  if (!tramite || !accion) return res.status(400).json({ ok: false });

  // obtener turno actual
  db.get(
    `SELECT id, folio, estado
     FROM turnos
     WHERE tramite = ? AND estado = 'EN_ATENCION'
     ORDER BY COALESCE(orden, id) ASC
     LIMIT 1`,
    [tramite],
    (err, actual) => {
      if (err) return res.status(500).json({ ok: false });
      if (!actual)
        return res.json({ ok: true, msg: "No hay turno en atención" });

      const avanzar = () => {
        avanzarAlSiguiente(tramite, (e3) => {
          if (e3) console.error(e3);
          return res.json({ ok: true });
        });
      };

      if (accion === "aceptar") {
        db.run(
          "UPDATE turnos SET estado = 'ATENDIDO', atendido_fin = ? WHERE id = ?",
          [Date.now(), actual.id],
          (e2) => {
            if (e2) return res.status(500).json({ ok: false });
            return avanzar();
          },
        );
        return;
      }

      if (accion === "rechazar") {
        db.run(
          "UPDATE turnos SET estado = 'CANCELADO', cancelado_en = ? WHERE id = ?",
          [Date.now(), actual.id],
          (e2) => {
            if (e2) return res.status(500).json({ ok: false });
            return avanzar();
          },
        );
        return;
      }

      if (accion === "espera") {
        // mover al final: orden = max + 1, estado vuelve a EN_ESPERA
        db.get(
          "SELECT MAX(COALESCE(orden, id)) as m FROM turnos WHERE tramite = ?",
          [tramite],
          (eMax, rMax) => {
            if (eMax) return res.status(500).json({ ok: false });

            const nuevoOrden = (rMax?.m || actual.id) + 1;

            db.run(
              "UPDATE turnos SET estado = 'EN_ESPERA', atendido_en = NULL, orden = ? WHERE id = ?",
              [nuevoOrden, actual.id],
              (e2) => {
                if (e2) return res.status(500).json({ ok: false });
                return avanzar();
              },
            );
          },
        );
        return;
      }

      return res.status(400).json({ ok: false, error: "Acción inválida" });
    },
  );
};
