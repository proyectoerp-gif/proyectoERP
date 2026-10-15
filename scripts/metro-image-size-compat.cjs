const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
for (const [consumer, dependency, expected] of [['@expo/metro-config','postcss','8.5.30'], ['xcode','uuid','11.1.1']]) {
  for (const location of Object.keys(lock.packages).filter(value => value.endsWith('/' + consumer))) {
    const packageFile = path.join(root, location, 'package.json');
    if (!fs.existsSync(packageFile)) continue;
    const installed = createRequire(packageFile)(dependency + '/package.json').version;
    if (installed !== expected) throw new Error(`No se aplicó la corrección de ${dependency}. Reinstala con npx npm@10.9.8 ci.`);
  }
}
const previous = 'const getImageSize = require("image-size");';
const previousNamed = 'const getImageSize = require("image-size").imageSize;';
const corrected = 'const getImageSize = input => require("image-size").imageSize(typeof input === "string" ? fs.readFileSync(input) : input);';
let adapted = 0;
for (const [location, metadata] of Object.entries(lock.packages)) {
  if (!metadata.dependencies?.['image-size']) continue;
  // This is a narrow API adaptation for the two existing Metro releases, not a parser fork.
  if (!location.endsWith('/metro') || !['0.81.5', '0.82.5'].includes(metadata.version)) {
    throw new Error('Revisa la compatibilidad de image-size antes de actualizar sus consumidores.');
  }
  const directory = path.resolve(root, location);
  if (!directory.startsWith(root + path.sep)) throw new Error('Ruta de dependencia inválida');
  const packageFile = path.join(directory, 'package.json');
  if (!fs.existsSync(packageFile)) continue; // Backend/web-only installations do not include Metro.
  const localRequire = createRequire(packageFile);
  const imageEntry = localRequire.resolve('image-size');
  const imagePackage = JSON.parse(fs.readFileSync(path.resolve(path.dirname(imageEntry), '../../package.json'), 'utf8'));
  if (imagePackage.version !== '2.0.4' || typeof localRequire('image-size').imageSize !== 'function') {
    throw new Error('Instala image-size 2.0.4 con npm ci antes de preparar Metro.');
  }
  const file = path.join(directory, 'src/Assets.js');
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(previous)) fs.writeFileSync(file, content.replace(previous, corrected));
  else if (content.includes(previousNamed)) fs.writeFileSync(file, content.replace(previousNamed, corrected));
  else if (!content.includes(corrected)) throw new Error('La API de Metro cambió; revisa la adaptación de imágenes.');
  adapted++;
}
console.log(`Compatibilidad con image-size corregido: ${adapted} instalación(es) de Metro.`);
