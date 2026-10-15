const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const lock = require('../package-lock.json');

test('Expo processes CSS with the corrected PostCSS API', async () => {
  const localRequire = createRequire(path.join(root, 'node_modules/@expo/metro-config/package.json'));
  assert.equal(localRequire('postcss/package.json').version, '8.5.30');
  const postcss = localRequire('postcss');
  const result = await postcss([tree => tree.walkDecls('color', declaration => { declaration.value = 'blue'; })])
    .process('.sample { color: red }', { from: undefined });
  assert.match(result.css, /color: blue/);
});
test('Xcode retains its CommonJS UUID generator with the corrected version', () => {
  const localRequire = createRequire(require.resolve('xcode/package.json'));
  assert.equal(localRequire('uuid/package.json').version, '11.1.1');
  const project = require('xcode').project('local-test.pbxproj');
  project.hash = { project: { objects: {} } };
  const identifiers = Array.from({length:100}, () => project.generateUuid());
  assert.equal(new Set(identifiers).size, 100);
  assert.ok(identifiers.every(id => /^[A-F0-9]{24}$/.test(id)));
});
test('each Metro uses image-size 2.0.4 and reads PNG buffers and asset file paths correctly', async () => {
  const png = fs.readFileSync(path.join(root, 'apps/mobile/src/assets/nucleo-erp-logo.png'));
  for (const [location, metadata] of Object.entries(lock.packages)) {
    if (!metadata.dependencies?.['image-size']) continue;
    const localRequire = createRequire(path.join(root, location, 'package.json'));
    assert.equal(typeof localRequire('image-size').imageSize, 'function');
    const asset = localRequire('./src/Assets.js').getAssetSize('png', png, 'logo.png');
    assert.deepEqual(asset, { width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
    const data = await localRequire('./src/Assets.js').getAssetData(path.join(root,'apps/mobile/src/assets/nucleo-erp-logo.png'),
      'src/assets/nucleo-erp-logo.png', [], 'android', '/assets');
    assert.equal(data.width, png.readUInt32BE(16));
    assert.equal(data.height, png.readUInt32BE(20));
  }
  assert.equal(lock.packages['node_modules/image-size'].version, '2.0.4');
});
test('malformed ICNS, HEIF and JXL images cannot hang the build process', () => {
  const code = `const {imageSize}=require('image-size');
    const icns=Buffer.alloc(16);icns.write('icns');icns.writeUInt32BE(16,4);icns.write('ic07',8);
    const heif=Buffer.alloc(24);heif.writeUInt32BE(16,0);heif.write('ftyp',4);heif.write('heic',8);heif.write('meta',20);
    const jxl=Buffer.from([0,0,0,12,74,88,76,32,13,10,135,10,0,0,0,0,106,120,108,112]);
    for(const bytes of [icns,heif,jxl]){try{imageSize(bytes);process.exitCode=1;}catch{}}`;
  const result = spawnSync(process.execPath, ['-e', code], {cwd:root,encoding:'utf8',timeout:3000,windowsHide:true});
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});
