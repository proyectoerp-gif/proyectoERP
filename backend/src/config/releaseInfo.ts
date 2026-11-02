import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
function read(relative:string){try{return JSON.parse(readFileSync(fileURLToPath(new URL(relative,import.meta.url)),'utf8'));}catch{return {};}}
export function releaseInfo(){
 const built=read('../../dist/build-info.json');
 return {release:built.apiVersion??read('../../package.json').version??null,webVersion:built.webVersion??read('../../../apps/web/package.json').version??null,mobileVersion:built.mobileVersion??read('../../../apps/mobile/app.json').expo?.version??null,revision:process.env.RENDER_GIT_COMMIT??built.revision??null,builtAt:built.builtAt??null,dirty:built.dirty??null};
}
