// Legacy Metro helpers call minimatch as a function. New callers use its named
// exports. Preserve both interfaces while running the corrected v11 matcher.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),lock=require('../package-lock.json');
for(const [location,metadata]of Object.entries(lock.packages)){
 if(!location.endsWith('/minimatch'))continue;
 if(Number(metadata.version.split('.')[0])!==11)throw Error('Unexpected minimatch version: review the compatibility bridge.');
 const entry=path.join(root,location,'dist/commonjs/index.js'),source=fs.readFileSync(entry,'utf8'),marker='/* proyecto-chatbot callable matcher compatibility */';
 if(!source.includes(marker))fs.appendFileSync(entry,'\n'+marker+'\nmodule.exports = Object.assign(module.exports.minimatch, module.exports);\n');
}
// The remaining upstream deepmerge 4.3.1 advisory has no published patch.
// Reject prototype-related keys in the bundled build tooling until upstream fixes it.
for(const location of Object.keys(lock.packages).filter(v=>v.endsWith('/deepmerge'))){
 const file=path.join(root,location,'index.js');let source=fs.readFileSync(file,'utf8');
 const before='function propertyIsUnsafe(target, key) {';
 if(source.includes(before)&&!source.includes('proyecto-chatbot prototype key guard')){
  source=source.replace(before,before+"\n\t/* proyecto-chatbot prototype key guard */\n\tif (key === '__proto__' || key === 'constructor' || key === 'prototype') return true;");fs.writeFileSync(file,source);
 }
}
