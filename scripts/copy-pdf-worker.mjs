import {createRequire} from 'node:module';
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const packagePath=require.resolve('pdfjs-dist/package.json');
const metadata=JSON.parse(await readFile(packagePath,'utf8'));
await mkdir(path.resolve('public'),{recursive:true});
await copyFile(path.join(path.dirname(packagePath),'build','pdf.worker.min.mjs'),path.resolve('public',`pdf.worker.${metadata.version}.min.mjs`));
console.log('PDF worker prepared for local text extraction.');
