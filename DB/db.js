const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// ruta al archivo real dentro de la misma carpeta DB
const dbPath = path.join(__dirname, "Servicios_Escolares.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error conectando a la base:", err.message);
  } else {
    console.log("✅ Conectado a Servicios_Escolares.db");
  }
});

module.exports = db;