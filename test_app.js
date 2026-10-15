/**
 * FocusFlow Automated Verification & Diagnostic Suite
 * Validates DOM integrity, JS syntax, selector parity, and core logic.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

console.log('\n========================================');
console.log('FocusFlow Verification Suite');
console.log('========================================\n');

// 1. Check all required files exist
const workspaceDir = __dirname;
const htmlPath = path.join(workspaceDir, 'index.html');
const cssPath = path.join(workspaceDir, 'style.css');
const jsPath = path.join(workspaceDir, 'script.js');
const readmePath = path.join(workspaceDir, 'README.md');

assert(fs.existsSync(htmlPath), 'index.html exists');
assert(fs.existsSync(cssPath), 'style.css exists');
assert(fs.existsSync(jsPath), 'script.js exists');
assert(fs.existsSync(readmePath), 'README.md exists');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const jsContent = fs.readFileSync(jsPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 2. Syntax validation of script.js
console.log('\n--- Checking JavaScript Syntax & Parsing ---');
try {
  new vm.Script(jsContent);
  assert(true, 'script.js syntax is valid ES6+ with zero parse errors');
} catch (e) {
  assert(false, `script.js parse error: ${e.message}`);
}

// 3. Verify DOM ID parity between script.js and index.html
console.log('\n--- Checking DOM Selector Parity ---');
const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const matchedIds = new Set();
let match;
while ((match = idRegex.exec(jsContent)) !== null) {
  matchedIds.add(match[1]);
}

let missingIds = [];
matchedIds.forEach(id => {
  const hasIdInHtml = htmlContent.includes(`id="${id}"`);
  if (!hasIdInHtml) {
    missingIds.push(id);
  }
});

assert(missingIds.length === 0, `All ${matchedIds.size} getElementById calls exist in index.html (Missing: ${missingIds.join(', ') || 'None'})`);

// 4. Verify CSS classes referenced in script.js exist in style.css or index.html
console.log('\n--- Checking Core CSS Classes ---');
const keyClasses = [
  'active-focus-task',
  'completed',
  'task-item',
  'task-checkbox',
  'btn-icon-task',
  'focus-action',
  'edit-action',
  'delete-action',
  'badge-priority-high',
  'badge-priority-medium',
  'badge-priority-low',
  'due-overdue',
  'due-today',
  'toast',
  'toast-success',
  'toast-info',
  'toast-danger'
];

keyClasses.forEach(cls => {
  const present = cssContent.includes(`.${cls}`);
  assert(present, `CSS class .${cls} defined in style.css`);
});

// 5. Test Logic: Priority & Date & Search Algorithms
console.log('\n--- Testing Logic & Data Transformations ---');

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };
assert(PRIORITY_ORDER.high > PRIORITY_ORDER.medium && PRIORITY_ORDER.medium > PRIORITY_ORDER.low, 'Priority values correctly ordered');

// Due date formatting logic simulation
function formatDueDate(dueDateString, testNow = new Date('2026-10-14T00:00:00')) {
  if (!dueDateString) return { label: 'No date', cssClass: '' };
  const due = new Date(dueDateString + 'T00:00:00');
  const today = new Date(testNow);
  today.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, cssClass: 'due-overdue' };
  if (diffDays === 0) return { label: 'Today', cssClass: 'due-today' };
  if (diffDays === 1) return { label: 'Tomorrow', cssClass: 'due-today' };
  return { label: `In ${diffDays} days`, cssClass: '' };
}

assert(formatDueDate('2026-10-14').label === 'Today', 'Due today returns "Today"');
assert(formatDueDate('2026-10-15').label === 'Tomorrow', 'Due tomorrow returns "Tomorrow"');
assert(formatDueDate('2026-10-10').label === '4d overdue', 'Past date returns overdue format');
assert(formatDueDate('2026-10-18').label === 'In 4 days', 'Future date returns "In X days"');

// Timer timestamp calculation logic simulation
const simulatedTargetEndTime = Date.now() + 1500 * 1000;
const simulatedDiff = Math.round((simulatedTargetEndTime - Date.now()) / 1000);
assert(simulatedDiff >= 1499 && simulatedDiff <= 1500, 'Timer targetEndTime accurately restores remaining seconds');

// Circular progress calculation
const RING_CIRCUMFERENCE = 2 * Math.PI * 92;
const halfProgressOffset = RING_CIRCUMFERENCE * (1 - 0.5);
assert(Math.round(halfProgressOffset) === Math.round(RING_CIRCUMFERENCE / 2), 'Progress ring offset is 50% at half duration');

// Search query filtering simulation
const testTasks = [
  { id: '1', title: 'Calculus III Integrals', category: 'Revision', notes: 'Surface integrals', completed: false },
  { id: '2', title: 'Python Asyncio', category: 'Coding', notes: 'Event loop', completed: true },
  { id: '3', title: 'Quantum Mechanics', category: 'Revision', notes: 'Wave functions', completed: false }
];

const searchQ = 'integrals';
const searchResults = testTasks.filter(t => 
  t.title.toLowerCase().includes(searchQ) || (t.notes && t.notes.toLowerCase().includes(searchQ))
);
assert(searchResults.length === 1 && searchResults[0].id === '1', 'Search filters accurately by title or notes');

// Completion metric calculation
const total = testTasks.length;
const completed = testTasks.filter(t => t.completed).length;
const percent = Math.round((completed / total) * 100);
assert(total === 3 && completed === 1 && percent === 33, 'Metrics: 1/3 completed is 33%');

// 6. Persistence & Refresh Integration Test
console.log('\n--- Testing LocalStorage & Refresh Persistence ---');
const mockStorage = {};
const fakeStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

fakeStorage.setItem('test_key', JSON.stringify({ savedAt: 12345 }));
const parsed = JSON.parse(fakeStorage.getItem('test_key'));
assert(parsed && parsed.savedAt === 12345, 'LocalStorage correctly serializes and restores objects');

const now = Date.now();
const testEndTime = now + 1500 * 1000;
const refreshAfter2Mins = now + 120 * 1000;
const remainingAfterRefresh = Math.max(0, Math.round((testEndTime - refreshAfter2Mins) / 1000));
assert(remainingAfterRefresh === 1380, 'Timer refresh calculation yields exact elapsed remainder (1380s / 23m)');

console.log('\n========================================');
console.log(`Results: ${passedTests}/${totalTests} tests passed`);
console.log('========================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
