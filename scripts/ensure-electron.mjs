import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const electronDir=path.join(root,'node_modules','electron');
const executable=path.join(electronDir,'dist',process.platform==='win32'?'electron.exe':'electron');

if(fs.existsSync(executable)){
  console.log('Electron runtime is installed.');
  process.exit(0);
}

const installer=path.join(electronDir,'install.js');
if(!fs.existsSync(installer)){
  console.error('Electron package is missing. Run npm install first.');
  process.exit(1);
}

console.log('Electron runtime is missing; running Electron installer directly...');
const result=spawnSync(process.execPath,[installer],{stdio:'inherit',cwd:root,env:process.env});
if(result.error)throw result.error;
if(result.status!==0){
  console.error(`Electron runtime installation failed with exit code ${result.status}.`);
  process.exit(result.status||1);
}
if(!fs.existsSync(executable)){
  console.error('Electron installer completed but the runtime executable was not created.');
  process.exit(1);
}
console.log('Electron runtime installed successfully.');
