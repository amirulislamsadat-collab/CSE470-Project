// ============================================================
// Model: Task — handles task-related database operations
// ============================================================
const db = require('../config/db');

const Task = {
  // filters is optional so every existing call site (which passes none)
  // behaves exactly as before.
  findAllByUser: async (userId, filters = {}) => {
    const conditions = ['t.user_id = ?'];
    const params = [userId];
    if (filters.status) { conditions.push('t.status = ?'); params.push(filters.status); }
    if (filters.priority) { conditions.push('t.priority = ?'); params.push(filters.priority); }
    if (filters.category_id) { conditions.push('t.category_id = ?'); params.push(filters.category_id); }

    const [rows] = await db.query(
      `SELECT t.*, c.name AS category_name
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY FIELD(t.status, 'pending', 'done') ASC, t.created_at DESC`,
      params
    );
    return rows;
  },

  findById: async (id, userId) => {
    const [rows] = await db.query(
      `SELECT t.*, c.name AS category_name
       FROM tasks t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, userId]
    );
    return rows[0] || null;
  },

  create: async (userId, data) => {
    const [result] = await db.query(
      `INSERT INTO tasks (user_id, category_id, title, description, priority, difficulty, availability, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, data.category_id || null, data.title, data.description || '',
       data.priority || 'medium', data.difficulty || 'normal', data.availability || 'flexible']
    );
    return result;
  },

  update: async (id, userId, data) => {
    const [result] = await db.query(
      `UPDATE tasks
       SET category_id = ?, title = ?, description = ?, priority = ?, difficulty = ?, availability = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [data.category_id || null, data.title, data.description || '',
       data.priority || 'medium', data.difficulty || 'normal',
       data.availability || 'flexible', data.status || 'pending', id, userId]
    );
    return result;
  },

  markDone: async (id, userId) => {
    await db.query("UPDATE tasks SET status = 'done' WHERE id = ? AND user_id = ?", [id, userId]);
  },

  delete: async (id, userId) => {
    await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  },

  getStats: async (userId) => {
    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'done') AS completed,
         SUM(status = 'pending') AS pending,
         SUM(priority = 'high' AND status = 'pending') AS hp_count
       FROM tasks WHERE user_id = ?`,
      [userId]
    );
    return {
      total:         parseInt(stats.total)     || 0,
      completed:     parseInt(stats.completed) || 0,
      pending:       parseInt(stats.pending)   || 0,
      high_priority: parseInt(stats.hp_count)  || 0
    };
  }
};

module.exports = Task;
