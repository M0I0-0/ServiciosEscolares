const express = require("express");
const sessionConfig = require("./config/session");
const middlewares = require("./config/middlewares");

const authRoutes = require("./routes/auth");
const alumnosRoutes = require("./routes/alumnos");
const turnosRoutes = require("./routes/turnos");
const pagesRoutes = require("./routes/pages");

const app = express();
const port = 3000;

// Middlewares
middlewares(app);

// Session
app.use(sessionConfig);

// Routes
app.use("/", pagesRoutes);
app.use("/auth", authRoutes);
app.use("/api/alumnos", alumnosRoutes);
app.use("/turnos", turnosRoutes);

// Server
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});