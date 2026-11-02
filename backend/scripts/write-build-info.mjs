import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),read=p=>JSON.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
let revision=process.env.RENDER_GIT_COMMIT??null;
if(!revision)try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();}catch{}
let dirty=false;try{execFileSync('git',['diff','--quiet','HEAD','--'],{cwd:root,windowsHide:true,stdio:'ignore'});}catch{dirty=true;}
writeFileSync(new URL('../dist/build-info.json',import.meta.url),JSON.stringify({revision,dirty,builtAt:new Date().toISOString(),apiVersion:read('backend/package.json').version,webVersion:read('apps/web/package.json').version,mobileVersion:read('apps/mobile/app.json').expo.version},null,2));
