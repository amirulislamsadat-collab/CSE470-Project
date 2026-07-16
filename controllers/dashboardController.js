const db = require('../config/db');

exports.getDashboard = async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.setup_completed != 1) return res.redirect('/setup');
  const userId = req.session.user.id;
  try {
    const [modules] = await db.query(
      `SELECT m.id, m.name, m.slug, m.description, m.icon
       FROM user_modules um
       INNER JOIN modules m ON um.module_id = m.id
       WHERE um.user_id = ? AND um.is_enabled = 1 ORDER BY m.id`,
      [userId]
    );
    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'done') AS completed,
         SUM(status = 'pending') AS pending,
         SUM(priority = 'high' AND status = 'pending') AS hp_count
       FROM tasks WHERE user_id = ?`,
      [userId]
    );
    res.render('dashboard', {
      user: req.session.user,
      modules,
      stats: {
        total:         parseInt(stats.total)         || 0,
        completed:     parseInt(stats.completed)     || 0,
        pending:       parseInt(stats.pending)       || 0,
        high_priority: parseInt(stats.hp_count) || 0
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.session.error = 'Dashboard error: ' + err.message;
    res.redirect('/login');
  }
};
