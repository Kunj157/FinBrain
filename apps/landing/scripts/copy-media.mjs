// Copies the product screenshots from docs/media into public/media so the
// landing page and the README share one set of images.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../../docs/media');
const target = resolve(here, '../public/media');

mkdirSync(target, { recursive: true });
if (existsSync(source)) cpSync(source, target, { recursive: true });
