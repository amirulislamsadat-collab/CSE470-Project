// ============================================================
// Database Configuration — MySQL Connection Pool via MAMP
// ============================================================

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     '127.0.0.1',
  user:     'root',
  password: 'root',
  database: 'alms_db',
  port:     8889,
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
