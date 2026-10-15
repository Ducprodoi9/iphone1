import {cpSync, existsSync, readdirSync, rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const source = fileURLToPath(new URL('../dist/', import.meta.url));
const target = fileURLToPath(new URL('../../ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc/www/', import.meta.url));
if (!existsSync(path.join(source, 'index.html'))) throw new Error('Build dist first');
for (const entry of readdirSync(target)) rmSync(path.join(target, entry), {recursive:true, force:true});
cpSync(source, target, {recursive:true});
console.log('Synced production dist to bundled iOS www');
