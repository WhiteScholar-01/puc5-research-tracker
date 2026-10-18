import {TASKS} from './catalog.js';
import {editableFields, validateImport} from './validation.js';
export class ConflictError extends Error {}
export class AccessError extends Error {}
export function validateConfig(config) {
  if (!config || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw new Error('Connect a Supabase project URL and browser publishable key in config.js.');
  return config;
}
export function fromRow(t) {
  return {id:t.id,status:t.status,priority:t.priority,dueDate:t.due_date,notes:t.notes,
    assigneeId:t.assignee_id,version:t.version,updatedAt:t.updated_at,updatedBy:t.updated_by};
}
function unwrap({data,error}) {
  if (error) {
    if (error.code === '40001') throw new ConflictError('This task changed since you opened it. Compare the latest version before saving again.');
    if (error.code === '42501' || error.code === 'PGRST301' || error.code === 'PGRST303') throw new AccessError('Your session or team membership is no longer active. Sign in again or contact the tracker owner.');
    throw new Error('The request could not be completed. Check your connection and try again.');
  }
  return data;
}
export function createStore(config, client) {
  validateConfig(config);
  if (!client) throw new Error('The sign-in service could not be loaded. Reload to try again.');
  const ids = new Set(TASKS.map(t=>t.id));
  async function requireUser() {
    const {data,error}=await client.auth.getUser();
    if (error || !data?.user) throw new AccessError('Sign in with an invited member account.');
    return data.user;
  }
  return {
    async signIn(email,password) {return unwrap(await client.auth.signInWithPassword({email,password}));},
    async signOut() {unwrap(await client.auth.signOut({scope:'local'}));},
    async requestRecovery(email,redirectUrl) {unwrap(await client.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl}));},
    async setPassword(password) {if(password.length<12) throw new Error('Use at least 12 characters.');return unwrap(await client.auth.updateUser({password}));},
    async getSession() {const data=unwrap(await client.auth.getSession());return data.session;},
    onAuthChange(callback) {return client.auth.onAuthStateChange(callback);},
    async loadTracker() {
      await requireUser();
      const snapshot=unwrap(await client.rpc('load_tracker'));
      if (!snapshot || !Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.members)) throw new Error('Unexpected tracker response. Contact the owner.');
      return {tasks:snapshot.tasks.map(fromRow),members:snapshot.members.map(m=>({id:m.user_id,name:m.display_name}))};
    },
    async saveTask(id,expectedVersion,fields) {
      if (!ids.has(id) || !Number.isSafeInteger(expectedVersion) || expectedVersion<0) throw new Error('Invalid task or version.');
      const clean=editableFields(fields);
      const data=unwrap(await client.rpc('save_task',{p_id:id,p_expected_version:expectedVersion,p_fields:clean}));
      if (!Array.isArray(data)||data.length!==1) throw new Error('No saved task was returned. Refresh before retrying.');
      return fromRow(data[0]);
    },
    async restoreTasks(records) {
      const clean=validateImport({format:'puc5-tracker',version:1,tasks:records},ids);
      const data=unwrap(await client.rpc('restore_tasks',{p_records:clean}));
      if (!Array.isArray(data)||data.length!==clean.length) throw new Error('Unexpected restore response. Refresh to check saved progress.');
      return data.map(fromRow);
    }
  };
}
