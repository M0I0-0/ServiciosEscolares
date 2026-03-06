const requireAuth = (req, res, next) => {

  if (req.session && req.session.usuario) {
    return next();
  }

  res.redirect("/");
};

module.exports = requireAuth;