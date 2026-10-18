export const STATUSES = ['pending', 'in-progress', 'completed'];
export const PRIORITIES = ['low', 'normal', 'high'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function isDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && localDate(d) === value;
}
export function summarize(tasks, today = localDate()) {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  return {total:tasks.length, completed, inProgress, pending:tasks.length-completed-inProgress,
    overdue:tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'completed').length,
    percent: tasks.length ? Math.round(100*completed/tasks.length) : 0};
}
export function filterTasks(tasks, {query='', phaseId='', status='', priority=''} = {}) {
  const q = query.trim().toLocaleLowerCase();
  return tasks.filter(t => (phaseId === '' || String(t.phaseId) === String(phaseId)) &&
    (!status || t.status === status) && (!priority || t.priority === priority) &&
    (!q || `${t.title} ${t.notes || ''}`.toLocaleLowerCase().includes(q)));
}
export function editableFields(t) {
  if (!STATUSES.includes(t.status) || !PRIORITIES.includes(t.priority)) throw new Error('Invalid task status or priority.');
  if (typeof t.notes !== 'string' || t.notes.length > 10000) throw new Error('Notes must contain at most 10,000 characters.');
  if (t.dueDate !== null && !isDate(t.dueDate)) throw new Error('Use a valid due date.');
  if (t.assigneeId !== null && (typeof t.assigneeId !== 'string' || !UUID.test(t.assigneeId))) throw new Error('Invalid member ID.');
  return {status:t.status, priority:t.priority, notes:t.notes, dueDate:t.dueDate, assigneeId:t.assigneeId};
}
export function validateImport(value, allowedIds) {
  if (!value || value.format !== 'puc5-tracker' || value.version !== 1 || !Array.isArray(value.tasks) || !value.tasks.length || value.tasks.length > allowedIds.size) throw new Error('Choose a supported, non-empty PUC5 JSON backup.');
  const seen = new Set();
  return value.tasks.map(t => {
    if (!t || !allowedIds.has(t.id) || seen.has(t.id)) throw new Error('Unknown or duplicate task ID.');
    seen.add(t.id);
    if (!Number.isSafeInteger(t.version) || t.version < 0) throw new Error('Invalid task version.');
    return {id:t.id, version:t.version, ...editableFields(t)};
  });
}
export function migrateLegacy(value, allowedIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length) throw new Error('Choose an original checklist JSON export.');
  return Object.entries(value).map(([id, done]) => {
    if (!allowedIds.has(id) || typeof done !== 'boolean') throw new Error('Invalid original checklist data.');
    return {id, status:done ? 'completed' : 'pending'};
  });
}
export function toCsv(tasks) {
  const cell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"','""') + '"';
  };
  const rows = [['Task ID','Task','Status','Priority','Due date','Notes','Assignee','Updated at'],
    ...tasks.map(t => [t.id,t.title,t.status,t.priority,t.dueDate,t.notes,t.assigneeId,t.updatedAt])];
  return '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}
