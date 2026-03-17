// ═══════════════════════════════════════════════════════
//  ETHICS QUEST — Google Apps Script
//  Paste this entire file into Google Apps Script editor
//  Then deploy as a Web App (see setup guide)
// ═══════════════════════════════════════════════════════

const SHEET_NAME = 'Learners';
const HEADERS = [
  'learnerId', 'learnerName', 'startTime', 'lastActive',
  'xp', 'modulesCompleted', 'totalWrongAttempts',
  'quizAttempts', 'modules'
];

// ── Handle GET requests (dashboard reading data) ─────────
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getAll') {
    return getAllLearners();
  }
  return jsonResponse({ error: 'Unknown action' });
}

// ── Handle POST requests (module saving progress) ────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveLearner(data);
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Get all learners and return as JSON array ────────────
function getAllLearners() {
  const sheet = getOrCreateSheet();
  const data = sheet.getDataRange().getValues();

  // Only headers row = no learners yet
  if (data.length <= 1) {
    return jsonResponse([]);
  }

  const learners = data.slice(1).map(row => {
    const obj = {};
    HEADERS.forEach((h, i) => { obj[h] = row[i]; });

    // Parse JSON fields back into objects/arrays
    try { obj.quizAttempts = JSON.parse(obj.quizAttempts || '[]'); } catch (e) { obj.quizAttempts = []; }
    try { obj.modules = JSON.parse(obj.modules || '{}'); } catch (e) { obj.modules = {}; }
    obj.xp = Number(obj.xp) || 0;
    obj.modulesCompleted = Number(obj.modulesCompleted) || 0;
    obj.totalWrongAttempts = Number(obj.totalWrongAttempts) || 0;

    return obj;
  });

  return jsonResponse(learners);
}

// ── Save or update a learner record ─────────────────────
function saveLearner(data) {
  const sheet = getOrCreateSheet();
  const learnerId = data.learnerId;
  if (!learnerId) return;

  const modulesCompleted = Object.values(data.modules || {}).filter(m => m.completed).length;

  const rowData = [
    learnerId,
    data.learnerName || '',
    data.startTime || new Date().toISOString(),
    data.lastActive || new Date().toISOString(),
    Number(data.xp) || 0,
    modulesCompleted,
    Number(data.totalWrongAttempts) || 0,
    JSON.stringify(data.quizAttempts || []),
    JSON.stringify(data.modules || {})
  ];

  // Check if this learner already has a row
  const values = sheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === learnerId) {
      existingRow = i + 1; // Sheet rows are 1-indexed
      break;
    }
  }

  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Add new row
    sheet.appendRow(rowData);
  }
}

// ── Get or create the Learners sheet ────────────────────
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add header row with formatting
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0b1437');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);  // learnerId
    sheet.setColumnWidth(2, 150);  // learnerName
    sheet.setColumnWidth(8, 300);  // quizAttempts
    sheet.setColumnWidth(9, 300);  // modules
  }

  return sheet;
}

// ── Helper: return JSON with CORS headers ────────────────
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
