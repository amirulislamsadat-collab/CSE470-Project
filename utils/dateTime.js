// ============================================================
// Utility: combineDateTime — merges a separate <input type="date">
// value and <input type="time"> value into one "YYYY-MM-DD HH:MM:SS"
// string for MySQL DATETIME columns.
//
// This never goes through a JS Date object, so it can't be shifted
// by local/UTC timezone conversion the way `new Date(...).toISOString()`
// was (that bug is what previously made saved times drift by several
// hours from what the user actually entered).
// ============================================================
function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return `${dateStr} ${timeStr.length === 5 ? timeStr + ':00' : timeStr}`;
}

module.exports = { combineDateTime };
