// ============================================================
// Controller: Module — handles module settings & toggle
// ============================================================
const Module = require('../models/Module');

exports.getSettings = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const modules = await Module.findAllWithUserStatus(req.session.user.id);
    res.render('module-settings', { user: req.session.user, modules });
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).send('An error occurred while loading the module settings. Please try again.');
  }
};

exports.toggleModule = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  const moduleId = req.params.id;
  try {
    const existing = await Module.findUserModule(userId, moduleId);
    if (existing) {
      await Module.toggleUserModule(userId, moduleId, existing.is_enabled);
    } else {
      await Module.enableForUser(userId, moduleId);
    }
    res.redirect('/modules/settings');
  } catch (err) {
    console.error('Toggle module error:', err);
    req.session.error = 'Failed to update module.';
    res.redirect('/modules/settings');
  }
};

exports.getModulePage = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const mod = await Module.findBySlug(req.params.slug);
    if (!mod) {
      req.session.error = 'Module not found.';
      return res.redirect('/dashboard');
    }
    res.render('module-page', { user: req.session.user, module: mod });
  } catch (err) {
    console.error('Module page error:', err);
    req.session.error = 'Failed to load module.';
    res.redirect('/dashboard');
  }
};
