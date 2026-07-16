const db = require('../config/db');

const roleRecommendations = {
  'Student':      [1, 2, 4, 6],
  'Professional': [1, 3, 5],
  'Freelancer':   [1, 3, 5, 6]
};

exports.getSetup = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const [roles]   = await db.query('SELECT * FROM roles ORDER BY id');
    const [modules] = await db.query('SELECT * FROM modules ORDER BY id');
    const step = req.query.step || 'role';
    const recommended = roleRecommendations[req.session.user.role] || [];
    res.render('setup', { user: req.session.user, roles, modules, step, recommended, roleRecommendations });
  } catch (err) {
    console.error('Setup error:', err);
    req.session.error = 'Failed to load setup.';
    res.redirect('/login');
  }
};

exports.postRole = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { role_id } = req.body;
  try {
    await db.query('UPDATE users SET role_id = ? WHERE id = ?', [role_id, req.session.user.id]);
    const [r] = await db.query('SELECT name FROM roles WHERE id = ?', [role_id]);
    req.session.user.role_id = parseInt(role_id);
    req.session.user.role = r.length ? r[0].name : 'Member';
    res.redirect('/setup?step=modules');
  } catch (err) {
    console.error('Setup role error:', err);
    req.session.error = 'Failed to save role.';
    res.redirect('/setup');
  }
};

exports.postModules = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const userId = req.session.user.id;
  let selected = req.body.modules || [];
  if (!Array.isArray(selected)) selected = [selected];
  try {
    await db.query('DELETE FROM user_modules WHERE user_id = ?', [userId]);
    for (const modId of selected) {
      await db.query('INSERT INTO user_modules (user_id, module_id, is_enabled) VALUES (?, ?, 1)', [userId, parseInt(modId)]);
    }
    await db.query('UPDATE users SET setup_completed = 1 WHERE id = ?', [userId]);
    req.session.user.setup_completed = 1;
    req.session.success = '🎉 Workspace launched! Welcome to ALMS.';
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Setup modules error:', err);
    req.session.error = 'Failed to save modules.';
    res.redirect('/setup?step=modules');
  }
};
