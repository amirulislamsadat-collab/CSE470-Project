const db = require('../config/db');

exports.getSettings = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  try {
    const [modules] = await db.query(
      `SELECT m.*, IFNULL(um.is_enabled, 0) AS is_enabled
       FROM modules m
       LEFT JOIN user_modules um ON m.id = um.module_id AND um.user_id = ?
       ORDER BY m.id`,
      [userId]
    );
    res.render('module-settings', { user: req.session.user, modules });
  } catch (err) {
    console.error('Settings error:', err);
    // Explicit fallback message so it NEVER sends a blank page
    res.status(500).send('An error occurred while loading the module settings. Please try again.');
  }
};

exports.toggleModule = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  const moduleId = req.params.id;
  try {
    const [existing] = await db.query(
      'SELECT * FROM user_modules WHERE user_id = ? AND module_id = ?',
      [userId, moduleId]
    );
    if (existing.length) {
      const newState = existing[0].is_enabled ? 0 : 1;
      await db.query('UPDATE user_modules SET is_enabled = ? WHERE user_id = ? AND module_id = ?', [newState, userId, moduleId]);
    } else {
      await db.query('INSERT INTO user_modules (user_id, module_id, is_enabled) VALUES (?, ?, 1)', [userId, moduleId]);
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
    const [rows] = await db.query(
      'SELECT slug, name, description FROM modules WHERE slug = ?',
      [req.params.slug]
    );

    if (!rows.length) {
      req.session.error = 'Module not found.';
      return res.redirect('/dashboard');
    }

    const mod = rows[0];
    res.render('module-page', {
      user: req.session.user,
      module: mod
    });
  } catch (err) {
    console.error('Module page error:', err);
    req.session.error = 'Failed to load module.';
    res.redirect('/dashboard');
  }
};
