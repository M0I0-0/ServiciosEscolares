const session = require("express-session");

module.exports = session({
  secret: "secreto_escolar_seguro_123",
  resave: false,
  saveUninitialized: false,
});