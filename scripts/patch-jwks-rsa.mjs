// jwks-rsa 4.1.0 synchronously requires ESM-only jose 6. Vercel's loader can
// reject that even on supported Node versions. Preserve both current versions
// and import jose inside the already-async signing-key conversion instead.
// Upstream: https://github.com/auth0/node-jwks-rsa/issues/507
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const sdkRequire=createRequire(require.resolve('firebase-admin/auth'));
const packagePath=sdkRequire.resolve('jwks-rsa/package.json');
const packageJson=JSON.parse(await readFile(packagePath,'utf8'));
const modulesRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../node_modules')+sep;
if(packageJson.version!=='4.1.0')throw new Error('Recheck the jwks-rsa compatibility patch for version '+packageJson.version+'.');
const marker='// T-Secure: jwks-rsa 4.1.0 async jose compatibility.';
const oldImport="const jose = require('jose');";
const asyncImport="  const jose = await import('jose');";
const plans=[
  ['src/utils.js',[
    [oldImport,marker],
    ['async function retrieveSigningKeys(jwks) {','async function retrieveSigningKeys(jwks) {\n'+asyncImport],
  ]],
  ['src/integrations/passport.js',[
    [oldImport,marker],
    ['return function secretProvider(req, rawJwtToken, cb) {','return async function secretProvider(req, rawJwtToken, cb) {'],
    ['    try {\n      decoded = {',"    try {\n      const jose = await import('jose');\n      decoded = {"],
  ]],
];
const writes=[];
for(const [relativePath,replacements] of plans){
  const target=resolve(dirname(packagePath),relativePath);
  if(!target.startsWith(modulesRoot))throw new Error('Refusing to patch a dependency outside this project.');
  let source=(await readFile(target,'utf8')).replaceAll('\r\n','\n');
  if(source.startsWith(marker)&&source.includes(asyncImport)&&!source.includes(oldImport))continue;
  for(const [before,after] of replacements){
    if(source.split(before).length!==2)throw new Error('Unexpected jwks-rsa source in '+relativePath+'; compatibility patch was not applied.');
    source=source.replace(before,after);
  }
  writes.push([target,source]);
}
for(const [target,source] of writes)await writeFile(target,source);
console.log(writes.length?'Applied jwks-rsa async jose compatibility patch.':'jwks-rsa ESM compatibility patch verified.');
