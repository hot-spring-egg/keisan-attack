#!/usr/bin/env node
/* カルク（Qalc2）の問題を、ケイサンアタックのプリセットとして取りこむ。
 *
 *   node tools/import-qalc-problems.mjs ../Qalc2
 *
 * カルクの src/data/problems.js から、どの端末でも同じになる種（PRESET_SEED）で
 * 全コースを作り、qalc-problems.js（window.QALC_PROBLEMS）に書き出す。
 * カルクの問題を直したら、これをもう一度走らせて qalc-problems.js をコミットする。
 * qalc-problems.js は手で直さないこと（次に取りこんだとき消える）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const qalcDir = path.resolve(process.argv[2] || '../Qalc2');
const src = path.join(qalcDir, 'src/data/problems.js');
if (!fs.existsSync(src)) { console.error(`見つかりません: ${src}\n使いかた: node tools/import-qalc-problems.mjs <Qalc2 のフォルダ>`); process.exit(2); }

const { buildPresetProblems, PRESET_SEED, courseCompare } = await import(pathToFileURL(src).href);
const problems = buildPresetProblems(PRESET_SEED);
const KEYPAD = /^[0-9./()\-]+$/; // ケイサンアタックのキーで打てる答えだけ

const out = {};
let total = 0;
for (const name of Object.keys(problems).sort(courseCompare)) {
  const rows = [];
  for (const { q, a } of problems[name]) {
    const answers = String(a).split('|').map(s => s.trim()).filter(s => KEYPAD.test(s));
    if (!String(q).trim() || answers.length === 0 || String(q).includes('|')) { console.warn(`とばしました: ${name} / ${q}`); continue; }
    rows.push([String(q), ...answers].join('|'));
  }
  if (rows.length) { out[name] = rows; total += rows.length; }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, '..', 'qalc-problems.js');
const header = `/* カルク（Qalc2）から取りこんだプリセットの問題。tools/import-qalc-problems.mjs が書き出したもの。手で直さないこと。
 * 形: { コースの名前: ["問題|答え|別の答え", ...] }  ${Object.keys(out).length}コース・${total}問（PRESET_SEED=${PRESET_SEED}）
 */
`;
fs.writeFileSync(dest, `${header}window.QALC_PROBLEMS = ${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"')};\n`);
console.log(`${path.relative(process.cwd(), dest)}: ${Object.keys(out).length}コース・${total}問`);
