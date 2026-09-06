// ============================================================
// Model: Category — handles category-related database operations
// ============================================================
const db = require('../config/db');

const Category = {
  findAll: async () => {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
    return rows;
  },

  // Lets the task form offer the existing categories as suggestions while
  // still accepting a brand-new one typed in free-form — looks up by name
  // (case-insensitive) and creates it if it doesn't exist yet.
  findOrCreate: async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const [existing] = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [trimmed]);
    if (existing.length) return existing[0].id;
    const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [trimmed]);
    return result.insertId;
  }
};

module.exports = Category;
