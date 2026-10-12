import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const DATA_DIR = path.resolve('data/interviews');
export const REC_DIR = path.resolve('recordings');

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.mkdir(REC_DIR, { recursive: true });

const ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export const newId = () => crypto.randomBytes(8).toString('hex');
export const isValidId = (id) => typeof id === 'string' && ID_RE.test(id);
export const recordingPath = (id) => path.join(REC_DIR, `${id}.webm`);

const file = (id) => path.join(DATA_DIR, `${id}.json`);

export async function getSession(id) {
  if (!isValidId(id)) return null;
  try {
    return JSON.parse(await fs.readFile(file(id), 'utf8'));
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  session.createdAt = session.createdAt || new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(file(session.id), JSON.stringify(session, null, 2));
  return session;
}

export async function listSessions() {
  const names = (await fs.readdir(DATA_DIR)).filter((n) => n.endsWith('.json'));
  const sessions = await Promise.all(names.map((n) => getSession(n.replace('.json', ''))));
  return sessions
    .filter(Boolean)
    .map(({ id, name, status, createdAt, evaluation }) => ({
      id, name, status, createdAt: createdAt || new Date(0).toISOString(), overallScore: evaluation?.overallScore ?? null,
    }))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

// Serialize read-modify-write per interview so concurrent updates (agent transcript posts,
// end-of-interview) can't overwrite each other.
const locks = new Map();

export function updateSession(id, fn) {
  const run = (locks.get(id) || Promise.resolve()).then(async () => {
    const session = await getSession(id);
    if (!session) return null;
    const result = await fn(session);
    await saveSession(session);
    return result === undefined ? session : result;
  });
  const tail = run.catch(() => {});
  locks.set(id, tail);
  tail.then(() => { if (locks.get(id) === tail) locks.delete(id); });
  return run;
}
