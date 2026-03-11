const express = require("express");
const router = express.Router();
const db = require("../DB/db");

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
return res.status(500).json({ error: "Error obteniendo métricas de horas pico" });
}

res.json(rows);

});

});
module.exports = router;