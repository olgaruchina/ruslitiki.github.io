import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { validateContent } from '../src/lib/content.mjs';

export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2) + '\n', {mode:0o600});
  await fs.rename(tmp, file);
}
export async function fileMap(root, excluded = []) {
  const result = {};
  async function walk(folder) {
    for (const entry of (await fs.readdir(folder, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      if (folder===root && excluded.includes(entry.name)) continue;
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symbolic links are not permitted in a release.');
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) result[path.relative(root,file).split(path.sep).join('/')] = digest(await fs.readFile(file));
    }
  }
  await walk(root);
  return result;
}
export async function rendererDigest(root) {
  const files = {};
  for (const folder of ['src','public']) files[folder] = await fileMap(path.join(root,folder));
  for (const file of ['package.json','package-lock.json','astro.config.mjs','scripts/check-content.mjs']) files[file] = digest(await fs.readFile(path.join(root,file)));
  return digest(files);
}
export function checkRevision(expected, actual) {
  if (expected !== actual) { const error = new Error('This draft changed in another window. Reload it before saving your changes.'); error.status=409; throw error; }
}
export async function saveDraft(directory, content, expectedHash) {
  const current = await json(path.join(directory,'draft.json'));
  checkRevision(expectedHash, digest(current));
  const errors = validateContent(content,{draft:true});
  if (errors.length) { const error = new Error(errors.join('\n')); error.status=422; throw error; }
  await atomicJson(path.join(directory,'draft.json'),content);
  return digest(content);
}
export async function savePublication(directory, publication) {
  const current=await json(path.join(directory,'publication.json')).catch(()=>null);
  if(current && current.id!==publication.id)await atomicJson(path.join(directory,'previous-publication.json'),current);
  await atomicJson(path.join(directory,'publication.json'),publication);
}
export function safeImage(buffer) {
  if (buffer.length > 2*1024*1024 || buffer.length < 16) throw new Error('Choose a PNG, JPEG or WebP image smaller than 2 MB.');
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer[0]===255 && buffer[1]===216 && buffer[2]===255) return 'jpg';
  if (buffer.subarray(0,4).toString()==='RIFF' && buffer.subarray(8,12).toString()==='WEBP') return 'webp';
  throw new Error('This file is not a supported PNG, JPEG or WebP image.');
}
