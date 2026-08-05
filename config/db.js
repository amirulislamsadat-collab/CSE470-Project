const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbFile = path.join(__dirname, '..', 'data', 'alms.sqlite');

let SQLPromise = null;
let database = null;

function ensureDataDir() {
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function loadDatabase() {
  ensureDataDir();
  if (!SQLPromise) {
    SQLPromise = initSqlJs({
      locateFile: file => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
    });
  }

  const SQL = await SQLPromise;
  if (fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  database.run('PRAGMA foreign_keys = ON;');
}

function persist() {
  if (!database) return;
  const data = database.export();
  fs.writeFileSync(dbFile, Buffer.from(data));
}

function isSelect(sql) {
  return /^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql);
}

function changes() {
  const result = database.exec('SELECT changes() AS c, last_insert_rowid() AS id');
  if (!result.length || !result[0].values.length) {
    return { affectedRows: 0, insertId: 0 };
  }
  return {
    affectedRows: result[0].values[0][0] || 0,
    insertId: result[0].values[0][1] || 0
  };
}

async function query(sql, params = []) {
  if (!database) {
    await loadDatabase();
  }

  if (isSelect(sql)) {
    const stmt = database.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return [rows];
  }

  database.run(sql, params);
  const meta = changes();
  persist();
  return [meta];
}

module.exports = {
  init: loadDatabase,
  query
};
