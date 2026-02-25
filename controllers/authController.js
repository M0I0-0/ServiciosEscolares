const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../DB/db");

// =====================================
// CONFIGURACIÓN GMAIL (APP PASSWORD)
// =====================================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "servicios.escolares.peto@gmail.com",
    pass: "shildntabctyxyeu",
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
  debug: true,
});

// Verifica conexión SMTP al iniciar
transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP verify error:", err);
  } else {
    console.log("✅ SMTP listo para enviar correos");
  }
});

const BASE_URL = "http://localhost:3000";

// =====================================
// CREAR TABLA PASSWORD_RESETS
// =====================================
db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  )
`);
// =====================================
// LOGIN
// =====================================
exports.login = (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.json({ ok: false, error: "Faltan datos" });
  }

  const queries = [
    "SELECT correo, contrasena FROM administradores WHERE correo = ? LIMIT 1",
    "SELECT correo, contrasena FROM personal WHERE correo = ? LIMIT 1",
    "SELECT correo, contrasena FROM alumnos WHERE correo = ? LIMIT 1",
  ];

  const buscar = (i) => {
    if (i >= queries.length) {
      return res.json({ ok: false, error: "Credenciales incorrectas" });
    }

    db.get(queries[i], [correo], (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.json({ ok: false, error: "Error del servidor" });
      }

      if (row && row.contrasena === password) {
        return res.json({ ok: true });
      }

      buscar(i + 1);
    });
  };

  buscar(0);
};

// =====================================
// FORGOT PASSWORD
// =====================================
exports.forgotPassword = (req, res) => {
  const correo = (req.body.correo || "").trim().toLowerCase();

  // Siempre redirige a la pantalla bonita (sin revelar si existe)
  const redirectOk = () => res.redirect("/recuperar_contrasena?ok=1");

  if (!correo) return redirectOk();

  const queries = [
    "SELECT correo FROM administradores WHERE correo = ? LIMIT 1",
    "SELECT correo FROM personal WHERE correo = ? LIMIT 1",
    "SELECT correo FROM alumnos WHERE correo = ? LIMIT 1",
  ];

  const buscar = (i) => {
    if (i >= queries.length) return redirectOk();

    db.get(queries[i], [correo], (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return redirectOk();
      }

      if (row) return generarTokenYEnviar();

      return buscar(i + 1);
    });
  };

  const generarTokenYEnviar = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    db.run(
      `INSERT INTO password_resets (correo, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [correo, tokenHash, expiresAt],
      async (err) => {
        if (err) {
          console.error("Insert error:", err);
          return redirectOk();
        }

        const link = `${BASE_URL}/auth/reset-password?token=${token}`;

        try {
          await transporter.sendMail({
            from: '"Servicios Escolares" <servicios.escolares.peto@gmail.com>',
            to: correo,
            subject: "Recuperación de contraseña",
            html: `
              <h2>Recuperación de contraseña</h2>
              <p>Solicitaste restablecer tu contraseña.</p>
              <p><a href="${link}">Restablecer contraseña</a></p>
              <p>Este enlace expira en 15 minutos.</p>
              <p>Si no fuiste tú, ignora este correo.</p>
            `,
          });
          console.log("✅ Correo enviado a:", correo);
        } catch (e) {
          console.error("❌ Error enviando correo:", e);
        }

        return redirectOk(); // SIEMPRE redirige
      },
    );
  };

  buscar(0);
};

// =====================================
// MOSTRAR FORM RESET
// =====================================
exports.showResetForm = (req, res) => {
  const token = (req.query.token || "").trim();
  if (!token) {
    return res.sendFile(
      path.join(__dirname, "..", "Public", "pages", "token_invalido.html"),
    );
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.get(
    `SELECT id, expires_at, used
     FROM password_resets
     WHERE token_hash = ?
     ORDER BY id DESC
     LIMIT 1`,
    [tokenHash],
    (err, row) => {
      if (err || !row) {
        return res.sendFile(
          path.join(__dirname, "..", "Public", "pages", "token_invalido.html"),
        );
      }

      if (row.used === 1 || Date.now() > row.expires_at) {
        return res.sendFile(
          path.join(__dirname, "..", "Public", "pages", "token_invalido.html"),
        );
      }

      // ✅ Token válido: mostrar formulario
      return res.sendFile(
        path.join(__dirname, "..", "Public", "pages", "reset_password.html"),
      );
    },
  );
};

// =====================================
// RESET PASSWORD
// =====================================
exports.resetPassword = (req, res) => {
  const token = (req.body.token || "").trim();
  const password = (req.body.password || "").trim();

  if (!token || !password) {
    return res.status(400).send("Solicitud inválida.");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.get(
    `SELECT id, correo, expires_at
     FROM password_resets
     WHERE token_hash = ? AND used = 0
     ORDER BY id DESC
     LIMIT 1`,
    [tokenHash],
    (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).send("Error interno.");
      }

      if (!row) {
        return res.redirect("/pages/token_invalido.html");
      }

      if (Date.now() > row.expires_at) {
        db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [row.id]);
        return res.redirect("/pages/token_invalido.html");
      }

      const correo = row.correo;

      const updates = [
        "UPDATE administradores SET contrasena = ? WHERE correo = ?",
        "UPDATE personal SET contrasena = ? WHERE correo = ?",
        "UPDATE alumnos SET contrasena = ? WHERE correo = ?",
      ];

      const actualizar = (i) => {
        if (i >= updates.length) {
          return res.status(400).send("No se encontró el usuario.");
        }

        db.run(updates[i], [password, correo], function (err) {
          if (err) {
            console.error("Update error:", err);
            return res.status(500).send("Error actualizando contraseña.");
          }

          if (this.changes > 0) {
            db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [
              row.id,
            ]);
            return res.redirect("/index?reset=1");
          }

          actualizar(i + 1);
        });
      };

      actualizar(0);
    },
  );
};
