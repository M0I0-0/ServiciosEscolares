const express = require("express");
const router = express.Router();
const db = require("../DB/db");
const PDFDocument = require("pdfkit");

router.get("/mensuales", (req, res) => {
  const query = `
SELECT 
strftime('%m', datetime(creado_en / 1000, 'unixepoch')) AS mes,
COUNT(*) AS total
FROM turnos
GROUP BY mes
ORDER BY mes
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error obteniendo métricas" });
    }

    res.json(rows);
  });
});

router.get("/horas-pico", (req, res) => {
  const query = `
SELECT 
strftime('%H', datetime(creado_en / 1000, 'unixepoch')) AS hora,
COUNT(*) AS total
FROM turnos
GROUP BY hora
ORDER BY hora
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Error obteniendo métricas de horas pico" });
    }

    res.json(rows);
  });
});

router.get("/por-personal", (req, res) => {
  const query = `
SELECT 
ventanilla,
COUNT(*) AS total
FROM turnos
WHERE finalizado_en IS NOT NULL
GROUP BY ventanilla
ORDER BY ventanilla
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Error obteniendo métricas por personal" });
    }

    res.json(rows);
  });
});

router.get("/tiempos-promedio", (req, res) => {
  const query = `
SELECT 
ventanilla,
AVG((finalizado_en - inicio_atencion_en) / 1000.0) AS tiempo_promedio
FROM turnos
WHERE finalizado_en IS NOT NULL
AND inicio_atencion_en IS NOT NULL
GROUP BY ventanilla
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Error obteniendo tiempos promedio" });
    }

    res.json(rows);
  });
});

router.get("/exportar-pdf", (req, res) => {
  const queryMensuales = `
SELECT 
strftime('%m', datetime(creado_en / 1000, 'unixepoch')) AS mes,
COUNT(*) AS total
FROM turnos
GROUP BY mes
ORDER BY mes
`;

  const queryHoras = `
SELECT 
strftime('%H', datetime(creado_en / 1000, 'unixepoch')) AS hora,
COUNT(*) AS total
FROM turnos
GROUP BY hora
ORDER BY hora
`;

  const queryPersonal = `
SELECT 
ventanilla,
COUNT(*) AS total
FROM turnos
WHERE finalizado_en IS NOT NULL
GROUP BY ventanilla
ORDER BY ventanilla
`;

  const queryTiempo = `
SELECT 
ventanilla,
AVG((finalizado_en - inicio_atencion_en) / 1000.0) AS tiempo_promedio
FROM turnos
WHERE finalizado_en IS NOT NULL
AND inicio_atencion_en IS NOT NULL
GROUP BY ventanilla
ORDER BY ventanilla
`;

  db.all(queryMensuales, [], (errMensuales, mensuales) => {
    if (errMensuales) {
      console.error(errMensuales);
      return res.status(500).send("Error generando PDF");
    }

    db.all(queryHoras, [], (errHoras, horas) => {
      if (errHoras) {
        console.error(errHoras);
        return res.status(500).send("Error generando PDF");
      }

      db.all(queryPersonal, [], (errPersonal, personal) => {
        if (errPersonal) {
          console.error(errPersonal);
          return res.status(500).send("Error generando PDF");
        }

        db.all(queryTiempo, [], (errTiempo, tiempos) => {
          if (errTiempo) {
            console.error(errTiempo);
            return res.status(500).send("Error generando PDF");
          }

          const mesesTexto = {
            "01": "Enero",
            "02": "Febrero",
            "03": "Marzo",
            "04": "Abril",
            "05": "Mayo",
            "06": "Junio",
            "07": "Julio",
            "08": "Agosto",
            "09": "Septiembre",
            10: "Octubre",
            11: "Noviembre",
            12: "Diciembre",
          };

          const doc = new PDFDocument({
            margin: 50,
            size: "A4",
          });

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="metricas_servicios_escolares.pdf"',
          );

          doc.pipe(res);

          doc.fontSize(18).text("Servicios Escolares", { align: "center" });
          doc.fontSize(15).text("Reporte de Métricas", { align: "center" });

          doc.moveDown();
          doc
            .fontSize(10)
            .text(
              `Fecha de generación: ${new Date().toLocaleString("es-MX")}`,
              {
                align: "right",
              },
            );

          doc.moveDown(2);

          doc.fontSize(13).text("1. Métricas mensuales", { underline: true });
          doc.moveDown(0.5);

          if (mensuales.length === 0) {
            doc.fontSize(11).text("No hay datos disponibles.");
          } else {
            mensuales.forEach((item) => {
              const nombreMes = mesesTexto[item.mes] || item.mes;
              doc.fontSize(11).text(`${nombreMes}: ${item.total} turnos`);
            });
          }

          doc.moveDown();

          doc.fontSize(13).text("2. Horas pico", { underline: true });
          doc.moveDown(0.5);

          if (horas.length === 0) {
            doc.fontSize(11).text("No hay datos disponibles.");
          } else {
            horas.forEach((item) => {
              doc.fontSize(11).text(`${item.hora}:00 - ${item.total} turnos`);
            });
          }

          doc.moveDown();

          doc
            .fontSize(13)
            .text("3. Métricas por personal", { underline: true });
          doc.moveDown(0.5);

          if (personal.length === 0) {
            doc.fontSize(11).text("No hay datos disponibles.");
          } else {
            personal.forEach((item) => {
              doc
                .fontSize(11)
                .text(
                  `Ventanilla ${item.ventanilla}: ${item.total} turnos atendidos`,
                );
            });
          }

          doc.moveDown();

          doc.fontSize(13).text("4. Tiempo promedio por ventanilla", {
            underline: true,
          });
          doc.moveDown(0.5);

          if (tiempos.length === 0) {
            doc.fontSize(11).text("No hay datos disponibles.");
          } else {
            tiempos.forEach((item) => {
              const segundos = Number(item.tiempo_promedio).toFixed(2);
              const minutos = (Number(item.tiempo_promedio) / 60).toFixed(2);

              doc
                .fontSize(11)
                .text(
                  `Ventanilla ${item.ventanilla}: ${minutos} min (${segundos} seg)`,
                );
            });
          }

          doc.end();
        });
      });
    });
  });
});

module.exports = router;
