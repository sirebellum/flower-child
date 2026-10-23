/**
 * Standalone Bundle Builder
 * Reads ES modules, strips imports/exports, concatenates them into an IIFE,
 * and produces js/bundle.js for file:/// protocol direct execution.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const files = [
  'js/geometry.js',
  'js/geometry3d.js',
  'js/state.js',
  'js/renderer.js',
  'js/renderer3d.js',
  'js/export.js',
  'js/interactions.js',
  'js/main.js'
];

let bundleBody = '';

const declaredTopLevel = new Set();

for (const relPath of files) {
  const fullPath = path.join(rootDir, relPath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Strip import statements
  content = content.replace(/^import\s+.*?;?\s*$/gm, '');

  // Strip export statements:
  // 1. export { ... };
  content = content.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '');
  // 2. export default ...;
  content = content.replace(/^export\s+default\s+.*?;?\s*$/gm, '');
  // 3. export const/function/class/let/var ...
  content = content.replace(/^export\s+(const|function|class|let|var)\s+/gm, '$1 ');

  // Deduplicate top-level const / let / var / function / class declarations across files
  content = content.replace(/^(const|let|var)\s+([A-Za-z0-9_]+)\s*=/gm, (match, type, name) => {
    if (declaredTopLevel.has(name)) {
      return `/* ${type} */ ${name} =`;
    }
    declaredTopLevel.add(name);
    return match;
  });

  content = content.replace(/^(function|class)\s+([A-Za-z0-9_]+)/gm, (match, type, name) => {
    if (declaredTopLevel.has(name)) {
      return `/* duplicate ${type} ${name} */\n_${type}_${name}`;
    }
    declaredTopLevel.add(name);
    return match;
  });

  bundleBody += `\n/* --- ${relPath} --- */\n` + content;
}

const finalBundle = `/**
 * SACRED GEOMETRY STUDIO — STANDALONE BUNDLE
 * Enables seamless execution on both file:/// direct protocol and local HTTP server.
 * Built automatically from ES modules.
 */
(function(window, document) {
  'use strict';

${bundleBody}

  window.SacredGeometry = {
    Geometry: SacredMath,
    SacredMath,
    SacredMath3D,
    State,
    SVGRenderer,
    Renderer3D,
    UI,
    Exporter,
    App
  };
  window.UI = UI;
  window.App = App;
  window.Renderer3D = Renderer3D;
  window.SacredMath3D = SacredMath3D;
  window.SacredMath = SacredMath;
  window.State = State;
  window.SVGRenderer = SVGRenderer;
  window.PresetsManager = PresetsManager;
  window.Exporter = Exporter;

})(window, document);
`;

const outputPath = path.join(rootDir, 'js/bundle.js');
fs.writeFileSync(outputPath, finalBundle, 'utf8');
console.log('Successfully built js/bundle.js (' + finalBundle.length + ' bytes)');
