import {readContent as readFile} from '../../src/lib/content.mjs';
// Keep old-draft regressions independent of changes to the public seed copy.
export const readContent=()=>readFile(new URL('./legacy-site.json',import.meta.url));
