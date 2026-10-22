// Generates the guilloché line art used across the UI (the engraved
// patterns you find on cheques and banknotes). The SVGs are used as CSS
// masks, so they can take any colour.
//
//   node scripts/guilloche.mjs

import { writeFileSync } from "node:fs";

const r1 = (n) => Math.round(n * 10) / 10;

function rosette({ size = 600, rings = 14, petals = 22, steps = 420 }) {
  const c = size / 2;
  const paths = [];
  for (let i = 0; i < rings; i++) {
    const base = c * (0.32 + (i / rings) * 0.6);
    const amp = c * (0.05 + 0.04 * Math.sin(i * 0.9));
    const phase = (i * Math.PI) / rings;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const rad = base + amp * Math.cos(petals * t + phase) + amp * 0.35 * Math.cos(3 * petals * t);
      d += `${s ? "L" : "M"}${r1(c + rad * Math.cos(t))} ${r1(c + rad * Math.sin(t))}`;
    }
    paths.push(d + "Z");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path d="${paths.join("")}" fill="none" stroke="#000" stroke-width="0.8"/></svg>`;
}

function band({ width = 240, height = 28, lines = 7, steps = 120 }) {
  const paths = [];
  for (let i = 0; i < lines; i++) {
    const phase = (i / lines) * Math.PI * 2;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const x = (s / steps) * width;
      const t = (x / width) * Math.PI * 2 * 4;
      const y = height / 2 + (height / 2 - 2) * Math.sin(t + phase) * Math.cos(t / 4);
      d += `${s ? "L" : "M"}${r1(x)} ${r1(y)}`;
    }
    paths.push(d);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${paths.join("")}" fill="none" stroke="#000" stroke-width="0.7"/></svg>`;
}

writeFileSync(new URL("../public/rosette.svg", import.meta.url), rosette({}));
writeFileSync(new URL("../public/band.svg", import.meta.url), band({}));
console.log("wrote public/rosette.svg and public/band.svg");
