const db = require("../DB/db");

const PROMEDIO_MIN = 15;
const PROMEDIO_SEG = PROMEDIO_MIN * 60;

const TIEMPO_LLAMADO_SEG = 180; // 3 min para presentarse
const VENTANILLAS_TOTALES = 6;

// ===============================
// INIT DB
// ===============================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS turnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT NOT NULL UNIQUE,
      tramite TEXT NOT NULL,
      correo TEXT,
      estado TEXT NOT NULL DEFAULT 'EN_ESPERA',
      creado_en INTEGER NOT NULL,
      orden INTEGER,

      ventanilla INTEGER,

      llamado_en INTEGER,
      inicio_atencion_en INTEGER,
      finalizado_en INTEGER,
      cancelado_en INTEGER,
      no_presentado_en INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ventanillas (
      numero INTEGER PRIMARY KEY,
      turno_actual_id INTEGER,
      actualizado_en INTEGER NOT NULL
    )
  `);

  for (let i = 1; i <= VENTANILLAS_TOTALES; i++) {
    db.run(
      `
      INSERT OR IGNORE INTO ventanillas (numero, turno_actual_id, actualizado_en)
      VALUES (?, NULL, ?)
    `,
      [i, Date.now()],
    );
  }

  // Compatibilidad con estructuras anteriores
  const columnas = [
    { nombre: "orden", sql: "ALTER TABLE turnos ADD COLUMN orden INTEGER" },
    {
      nombre: "ventanilla",
      sql: "ALTER TABLE turnos ADD COLUMN ventanilla INTEGER",
    },
    {
      nombre: "llamado_en",
      sql: "ALTER TABLE turnos ADD COLUMN llamado_en INTEGER",
    },
    {
      nombre: "inicio_atencion_en",
      sql: "ALTER TABLE turnos ADD COLUMN inicio_atencion_en INTEGER",
    },
    {
      nombre: "finalizado_en",
      sql: "ALTER TABLE turnos ADD COLUMN finalizado_en INTEGER",
    },
    {
      nombre: "cancelado_en",
      sql: "ALTER TABLE turnos ADD COLUMN cancelado_en INTEGER",
    },
    {
      nombre: "no_presentado_en",
      sql: "ALTER TABLE turnos ADD COLUMN no_presentado_en INTEGER",
    },
  ];

  db.all(`PRAGMA table_info(turnos)`, (err, rows) => {
    if (err || !rows) return;

    const existentes = new Set(rows.map((r) => r.name));
    columnas.forEach((col) => {
      if (!existentes.has(col.nombre)) {
        db.run(col.sql, () => {});
      }
    });
  });
});

// ===============================
// HELPERS
// ===============================
const pad3 = (n) => String(n).padStart(3, "0");

function getDatePartsMX(ts = Date.now()) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { yyyy, mm, dd, ymd: `${yyyy}${mm}${dd}` };
}

function generarFolio(cb) {
  const now = Date.now();
  const { yyyy, mm, dd, ymd } = getDatePartsMX(now);

  const inicioDia = new Date(`${yyyy}-${mm}-${dd}T00:00:00`).getTime();
  const finDia = new Date(`${yyyy}-${mm}-${dd}T23:59:59.999`).getTime();

  db.get(
    `
    SELECT COUNT(*) AS c
    FROM turnos
    WHERE creado_en BETWEEN ? AND ?
  `,
    [inicioDia, finDia],
    (err, row) => {
      if (err) return cb(err);
      const consecutivo = (row?.c || 0) + 1;
      cb(null, `SE-${ymd}-${pad3(consecutivo)}`);
    },
  );
}

function getMaxOrden(cb) {
  db.get(
    `SELECT MAX(COALESCE(orden, id)) AS maxOrden FROM turnos`,
    [],
    (err, row) => {
      if (err) return cb(err);
      cb(null, row?.maxOrden || 0);
    },
  );
}

function liberarVentanilla(numero, cb) {
  db.run(
    `
    UPDATE ventanillas
    SET turno_actual_id = NULL, actualizado_en = ?
    WHERE numero = ?
  `,
    [Date.now(), numero],
    (err) => cb?.(err),
  );
}

function liberarVentanillaPorTurno(turnoId, cb) {
  db.get(
    `
    SELECT numero
    FROM ventanillas
    WHERE turno_actual_id = ?
  `,
    [turnoId],
    (err, row) => {
      if (err) return cb?.(err);
      if (!row) return cb?.(null);
      liberarVentanilla(row.numero, cb);
    },
  );
}

function obtenerTurnoActualVentanilla(ventanilla, cb) {
  db.get(
    `
    SELECT
      t.id,
      t.folio,
      t.tramite,
      t.correo,
      t.estado,
      t.orden,
      t.ventanilla,
      t.llamado_en,
      t.inicio_atencion_en,
      v.numero AS ventanilla_numero
    FROM ventanillas v
    LEFT JOIN turnos t ON t.id = v.turno_actual_id
    WHERE v.numero = ?
  `,
    [ventanilla],
    (err, row) => {
      if (err) return cb(err);
      if (!row || !row.id) return cb(null, null);
      cb(null, row);
    },
  );
}

function obtenerSiguienteEnEspera(cb) {
  db.get(
    `
    SELECT
      id,
      folio,
      tramite,
      correo,
      estado,
      orden
    FROM turnos
    WHERE estado = 'EN_ESPERA'
    ORDER BY COALESCE(orden, id) ASC
    LIMIT 1
  `,
    [],
    (err, row) => cb(err, row || null),
  );
}

function obtenerProximosEnEspera(limit = 3, excludeId = null, cb) {
  let sql = `
    SELECT id, folio, tramite, correo, estado, orden
    FROM turnos
    WHERE estado = 'EN_ESPERA'
  `;
  const params = [];

  if (excludeId) {
    sql += ` AND id <> ? `;
    params.push(excludeId);
  }

  sql += ` ORDER BY COALESCE(orden, id) ASC LIMIT ? `;
  params.push(limit);

  db.all(sql, params, (err, rows) => cb(err, rows || []));
}

function contarAdelante(turno, cb) {
  const ordenRef = turno.orden ?? turno.id;

  db.get(
    `
    SELECT COUNT(*) AS c
    FROM turnos
    WHERE estado IN ('LLAMADO', 'EN_ATENCION')
  `,
    [],
    (err1, activos) => {
      if (err1) return cb(err1);

      db.get(
        `
        SELECT COUNT(*) AS c
        FROM turnos
        WHERE estado = 'EN_ESPERA'
          AND COALESCE(orden, id) < ?
      `,
        [ordenRef],
        (err2, espera) => {
          if (err2) return cb(err2);

          const adelante = (activos?.c || 0) + (espera?.c || 0);
          cb(null, adelante);
        },
      );
    },
  );
}

function calcularExtraPorDemora(cb) {
  db.all(
    `
    SELECT inicio_atencion_en
    FROM turnos
    WHERE estado = 'EN_ATENCION'
      AND inicio_atencion_en IS NOT NULL
  `,
    [],
    (err, rows) => {
      if (err) return cb(err);

      let extra = 0;
      const now = Date.now();

      for (const row of rows || []) {
        const transSeg = Math.floor((now - row.inicio_atencion_en) / 1000);
        if (transSeg > PROMEDIO_SEG) {
          const bloquesExtra =
            Math.floor((transSeg - PROMEDIO_SEG) / PROMEDIO_SEG) + 1;
          extra += bloquesExtra * 300; // +5 min por bloque excedido
        }
      }

      cb(null, extra);
    },
  );
}

function procesarLlamadosCaducados(cb) {
  const limite = Date.now() - TIEMPO_LLAMADO_SEG * 1000;

  db.all(
    `
    SELECT id, ventanilla
    FROM turnos
    WHERE estado = 'LLAMADO'
      AND llamado_en IS NOT NULL
      AND llamado_en <= ?
  `,
    [limite],
    (err, rows) => {
      if (err) return cb?.(err);

      if (!rows || rows.length === 0) return cb?.(null);

      let pendientes = rows.length;
      let huboError = null;

      rows.forEach((row) => {
        db.run(
          `
          UPDATE turnos
          SET estado = 'NO_PRESENTADO',
              no_presentado_en = ?,
              ventanilla = NULL
          WHERE id = ?
        `,
          [Date.now(), row.id],
          (e1) => {
            if (e1 && !huboError) huboError = e1;

            liberarVentanilla(row.ventanilla, (e2) => {
              if (e2 && !huboError) huboError = e2;

              pendientes -= 1;
              if (pendientes === 0) cb?.(huboError);
            });
          },
        );
      });
    },
  );
}

function normalizarAccion(accion) {
  const a = (accion || "").trim().toLowerCase();

  if (a === "aceptar") return "llamar";
  if (a === "llamar") return "llamar";
  if (a === "iniciar") return "iniciar";
  if (a === "finalizar") return "finalizar";
  if (a === "rechazar") return "rechazar";
  if (a === "espera") return "espera";

  return "";
}

// ===============================
// POST /turnos/crear
// body: { tramite, correo? }
// ===============================
exports.crearTurno = (req, res) => {
  const tramite = (req.body.tramite || "").trim();
  const correo = (req.body.correo || "").trim().toLowerCase() || null;

  if (!tramite) {
    return res.status(400).json({ ok: false, error: "Falta trámite" });
  }

  generarFolio((folioErr, folio) => {
    if (folioErr) {
      console.error(folioErr);
      return res
        .status(500)
        .json({ ok: false, error: "No se pudo generar folio" });
    }

    getMaxOrden((ordenErr, maxOrden) => {
      if (ordenErr) {
        console.error(ordenErr);
        return res.status(500).json({ ok: false, error: "DB error" });
      }

      const creado_en = Date.now();
      const orden = maxOrden + 1;

      db.run(
        `
        INSERT INTO turnos (
          folio, tramite, correo, estado, creado_en, orden
        )
        VALUES (?, ?, ?, 'EN_ESPERA', ?, ?)
      `,
        [folio, tramite, correo, creado_en, orden],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              ok: false,
              error: "No se pudo crear el turno",
            });
          }

          return res.json({
            ok: true,
            folio,
            tramite,
          });
        },
      );
    });
  });
};

// ===============================
// GET /turnos/estado?folio=SE-20260308-001
// ===============================
exports.estadoTurno = (req, res) => {
  const folio = (req.query.folio || "").trim();
  if (!folio) return res.status(400).json({ ok: false, error: "Falta folio" });

  procesarLlamadosCaducados((e0) => {
    if (e0) {
      console.error(e0);
      return res.status(500).json({ ok: false });
    }

    db.get(
      `
      SELECT
        id,
        folio,
        tramite,
        correo,
        estado,
        orden,
        ventanilla,
        creado_en,
        llamado_en,
        inicio_atencion_en,
        finalizado_en,
        cancelado_en,
        no_presentado_en
      FROM turnos
      WHERE folio = ?
    `,
      [folio],
      (err, miTurno) => {
        if (err) return res.status(500).json({ ok: false });
        if (!miTurno)
          return res
            .status(404)
            .json({ ok: false, error: "No existe el turno" });

        contarAdelante(miTurno, (e1, adelante) => {
          if (e1) return res.status(500).json({ ok: false });

          calcularExtraPorDemora((e2, extraDemoraSeg) => {
            if (e2) return res.status(500).json({ ok: false });

            db.all(
              `
              SELECT folio
              FROM turnos
              WHERE estado = 'EN_ESPERA'
                AND COALESCE(orden, id) < COALESCE(?, ?)
              ORDER BY COALESCE(orden, id) DESC
              LIMIT 2
            `,
              [miTurno.orden, miTurno.id],
              (e3, prevs) => {
                if (e3) return res.status(500).json({ ok: false });

                let estimadoSeg = 0;
                if (miTurno.estado === "EN_ESPERA") {
                  estimadoSeg =
                    Math.ceil(adelante / VENTANILLAS_TOTALES) * PROMEDIO_SEG +
                    extraDemoraSeg;
                }

                let restanteSeg = null;

                if (miTurno.estado === "LLAMADO") {
                  const inicio = miTurno.llamado_en || Date.now();
                  const trans = Math.floor((Date.now() - inicio) / 1000);
                  restanteSeg = Math.max(0, TIEMPO_LLAMADO_SEG - trans);
                }

                return res.json({
                  ok: true,
                  miTurno: {
                    folio: miTurno.folio,
                    tramite: miTurno.tramite,
                    correo: miTurno.correo,
                    estado: miTurno.estado,
                    ventanilla: miTurno.ventanilla,
                  },
                  proximos_adelante: (prevs || []).map((x) => x.folio),
                  estimadoSeg,
                  restanteSeg,
                });
              },
            );
          });
        });
      },
    );
  });
};

// ===============================
// POST /turnos/cancelar
// body: { folio }
// ===============================
exports.cancelarTurno = (req, res) => {
  const folio = (req.body.folio || "").trim();
  if (!folio) return res.status(400).json({ ok: false, error: "Falta folio" });

  db.get(
    `
    SELECT id, estado, ventanilla
    FROM turnos
    WHERE folio = ?
  `,
    [folio],
    (err, row) => {
      if (err || !row) {
        return res
          .status(400)
          .json({ ok: false, error: "Turno no encontrado" });
      }

      if (["FINALIZADO", "CANCELADO", "NO_PRESENTADO"].includes(row.estado)) {
        return res.json({ ok: true });
      }

      db.run(
        `
        UPDATE turnos
        SET estado = 'CANCELADO',
            cancelado_en = ?,
            ventanilla = NULL
        WHERE id = ?
      `,
        [Date.now(), row.id],
        (e1) => {
          if (e1) return res.status(500).json({ ok: false });

          liberarVentanilla(row.ventanilla, (e2) => {
            if (e2) console.error(e2);
            return res.json({ ok: true });
          });
        },
      );
    },
  );
};

// ===============================
// POST /turnos/tick
// body opcional: {}
// Fuerza procesamiento de llamados vencidos
// ===============================
exports.tick = (req, res) => {
  procesarLlamadosCaducados((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false });
    }

    return res.json({ ok: true });
  });
};

// ===============================
// GET /turnos/personal/cola?ventanilla=1
// ===============================
exports.colaPersonal = (req, res) => {
  const ventanilla = Number(req.query.ventanilla);

  if (!ventanilla || ventanilla < 1 || ventanilla > VENTANILLAS_TOTALES) {
    return res.status(400).json({
      ok: false,
      error: "Ventanilla inválida",
    });
  }

  procesarLlamadosCaducados((e0) => {
    if (e0) {
      console.error(e0);
      return res.status(500).json({ ok: false });
    }

    obtenerTurnoActualVentanilla(ventanilla, (e1, actual) => {
      if (e1) return res.status(500).json({ ok: false });

      if (actual) {
        const armado = { ...actual };

        if (armado.estado === "LLAMADO") {
          const trans = Math.floor(
            (Date.now() - (armado.llamado_en || Date.now())) / 1000,
          );
          armado.restanteSeg = Math.max(0, TIEMPO_LLAMADO_SEG - trans);
        }

        return obtenerProximosEnEspera(3, null, (e2, proximos) => {
          if (e2) return res.status(500).json({ ok: false });

          return res.json({
            ok: true,
            ventanilla,
            actual: armado,
            proximos,
          });
        });
      }

      obtenerSiguienteEnEspera((e2, preview) => {
        if (e2) return res.status(500).json({ ok: false });

        obtenerProximosEnEspera(3, preview?.id || null, (e3, proximos) => {
          if (e3) return res.status(500).json({ ok: false });

          return res.json({
            ok: true,
            ventanilla,
            actual: preview
              ? {
                  ...preview,
                  estado: "EN_ESPERA",
                  ventanilla,
                  preview: true,
                }
              : null,
            proximos,
          });
        });
      });
    });
  });
};

// ===============================
// POST /turnos/personal/accion
// body: { ventanilla, accion }
// acciones:
// - llamar   (alias aceptar)
// - iniciar
// - finalizar
// - rechazar
// - espera
// ===============================
exports.accionPersonal = (req, res) => {
  const ventanilla = Number(req.body.ventanilla);
  const accion = normalizarAccion(req.body.accion);

  if (!ventanilla || ventanilla < 1 || ventanilla > VENTANILLAS_TOTALES) {
    return res.status(400).json({ ok: false, error: "Ventanilla inválida" });
  }

  if (!accion) {
    return res.status(400).json({ ok: false, error: "Acción inválida" });
  }

  procesarLlamadosCaducados((e0) => {
    if (e0) {
      console.error(e0);
      return res.status(500).json({ ok: false });
    }

    obtenerTurnoActualVentanilla(ventanilla, (e1, actual) => {
      if (e1) return res.status(500).json({ ok: false });

      // =========================
      // LLAMAR
      // =========================
      if (accion === "llamar") {
        if (actual) {
          return res.json({
            ok: true,
            msg: "La ventanilla ya tiene un turno activo",
          });
        }

        return obtenerSiguienteEnEspera((e2, siguiente) => {
          if (e2) return res.status(500).json({ ok: false });
          if (!siguiente) {
            return res.json({ ok: true, msg: "No hay turnos en espera" });
          }

          db.run(
            `
            UPDATE turnos
            SET estado = 'LLAMADO',
                ventanilla = ?,
                llamado_en = ?,
                inicio_atencion_en = NULL
            WHERE id = ?
          `,
            [ventanilla, Date.now(), siguiente.id],
            (e3) => {
              if (e3) return res.status(500).json({ ok: false });

              db.run(
                `
                UPDATE ventanillas
                SET turno_actual_id = ?, actualizado_en = ?
                WHERE numero = ?
              `,
                [siguiente.id, Date.now(), ventanilla],
                (e4) => {
                  if (e4) return res.status(500).json({ ok: false });
                  return res.json({ ok: true });
                },
              );
            },
          );
        });
      }

      // Las demás acciones requieren turno actual
      if (!actual) {
        return res.json({
          ok: true,
          msg: "No hay turno activo en esta ventanilla",
        });
      }

      // =========================
      // INICIAR
      // =========================
      if (accion === "iniciar") {
        if (actual.estado !== "LLAMADO") {
          return res.status(400).json({
            ok: false,
            error: "Solo se puede iniciar un turno llamado",
          });
        }

        db.run(
          `
          UPDATE turnos
          SET estado = 'EN_ATENCION',
              inicio_atencion_en = ?
          WHERE id = ?
        `,
          [Date.now(), actual.id],
          (e2) => {
            if (e2) return res.status(500).json({ ok: false });
            return res.json({ ok: true });
          },
        );
        return;
      }

      // =========================
      // FINALIZAR
      // =========================
      if (accion === "finalizar") {
        if (actual.estado !== "EN_ATENCION") {
          return res.status(400).json({
            ok: false,
            error: "Solo se puede finalizar un turno en atención",
          });
        }

        db.run(
          `
          UPDATE turnos
          SET estado = 'FINALIZADO',
              finalizado_en = ?,
              ventanilla = NULL
          WHERE id = ?
        `,
          [Date.now(), actual.id],
          (e2) => {
            if (e2) return res.status(500).json({ ok: false });

            liberarVentanilla(ventanilla, (e3) => {
              if (e3) return res.status(500).json({ ok: false });
              return res.json({ ok: true });
            });
          },
        );
        return;
      }

      // =========================
      // RECHAZAR
      // =========================
      if (accion === "rechazar") {
        db.run(
          `
          UPDATE turnos
          SET estado = 'CANCELADO',
              cancelado_en = ?,
              ventanilla = NULL
          WHERE id = ?
        `,
          [Date.now(), actual.id],
          (e2) => {
            if (e2) return res.status(500).json({ ok: false });

            liberarVentanilla(ventanilla, (e3) => {
              if (e3) return res.status(500).json({ ok: false });
              return res.json({ ok: true });
            });
          },
        );
        return;
      }

      // =========================
      // ESPERA
      // =========================
      if (accion === "espera") {
        getMaxOrden((e2, maxOrden) => {
          if (e2) return res.status(500).json({ ok: false });

          db.run(
            `
            UPDATE turnos
            SET estado = 'EN_ESPERA',
                orden = ?,
                ventanilla = NULL,
                llamado_en = NULL,
                inicio_atencion_en = NULL
            WHERE id = ?
          `,
            [maxOrden + 1, actual.id],
            (e3) => {
              if (e3) return res.status(500).json({ ok: false });

              liberarVentanilla(ventanilla, (e4) => {
                if (e4) return res.status(500).json({ ok: false });
                return res.json({ ok: true });
              });
            },
          );
        });
        return;
      }

      return res.status(400).json({ ok: false, error: "Acción no soportada" });
    });
  });
};
