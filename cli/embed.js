#!/usr/bin/env node
// `ozc embed <dir> [<dir2>...]` → TF-IDF vectorize local files → PCA to 3D → output JSON
// Output: docs/embed-data.json — consumed by docs/explore.html for 3D visualization
//
// Semantic search: `ozc embed-search "<query>" <dir>` → cosine similarity ranking

import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, extname, basename } from "path";

const TEXT_EXT = new Set([".md",".txt",".json",".html",".py",".js",".ts",".sol",".csv",".yml",".yaml",".toml",".sh",".jsx",".tsx",".rs",".go"]);

// ── tokenize ──
function tokenize(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, " ").split(/\s+/).filter(t => t.length > 2 && t.length < 30);
}

// ── scan files ──
function scanFiles(dirs) {
  const files = [];
  function walk(dir, depth = 0) {
    if (depth > 5) return;
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name.startsWith(".") || name === "node_modules" || name === "out" || name === "cache") continue;
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) { walk(full, depth + 1); continue; }
      if (!TEXT_EXT.has(extname(name).toLowerCase())) continue;
      if (st.size > 500_000) continue;
      try {
        const content = readFileSync(full, "utf8");
        const tokens = tokenize(content);
        files.push({ path: full, name: basename(full), ext: extname(full), size: st.size,
                      preview: content.slice(0, 200).replace(/\n/g, " "), tokens });
      } catch {}
    }
  }
  for (const d of dirs) walk(d);
  return files;
}

// ── TF-IDF ──
function tfidf(files) {
  const df = {};
  for (const f of files) {
    const unique = new Set(f.tokens);
    for (const t of unique) df[t] = (df[t] || 0) + 1;
  }
  // keep top 500 terms by DF (but not too common)
  const N = files.length;
  const vocab = Object.entries(df)
    .filter(([, c]) => c >= 2 && c < N * 0.9)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 500)
    .map(([t]) => t);
  const vocabIdx = Object.fromEntries(vocab.map((t, i) => [t, i]));
  const D = vocab.length;

  const vectors = files.map(f => {
    const tf = {};
    for (const t of f.tokens) if (vocabIdx[t] !== undefined) tf[t] = (tf[t] || 0) + 1;
    const vec = new Float64Array(D);
    for (const [t, c] of Object.entries(tf)) {
      const i = vocabIdx[t];
      vec[i] = c * Math.log(N / (df[t] || 1));
    }
    // normalize
    let norm = 0;
    for (let i = 0; i < D; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < D; i++) vec[i] /= norm;
    return vec;
  });

  return { vectors, vocab, vocabIdx };
}

// ── PCA to 3D ──
function pca3d(vectors) {
  const N = vectors.length;
  if (N === 0) return [];
  const D = vectors[0].length;

  // center
  const mean = new Float64Array(D);
  for (const v of vectors) for (let i = 0; i < D; i++) mean[i] += v[i] / N;
  const centered = vectors.map(v => { const c = new Float64Array(D); for (let i = 0; i < D; i++) c[i] = v[i] - mean[i]; return c; });

  // power iteration for top 3 principal components
  function powerIteration(mat, deflated) {
    const d = mat[0].length;
    let pc = new Float64Array(d);
    for (let i = 0; i < d; i++) pc[i] = Math.random();
    for (let iter = 0; iter < 100; iter++) {
      const next = new Float64Array(d);
      for (const row of mat) {
        let dot = 0;
        for (let i = 0; i < d; i++) dot += row[i] * pc[i];
        for (let i = 0; i < d; i++) next[i] += dot * row[i];
      }
      let norm = 0;
      for (let i = 0; i < d; i++) norm += next[i] * next[i];
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < d; i++) pc[i] = next[i] / norm;
    }
    return pc;
  }

  function project(mat, pc) {
    return mat.map(row => { let s = 0; for (let i = 0; i < row.length; i++) s += row[i] * pc[i]; return s; });
  }

  function deflate(mat, pc) {
    return mat.map(row => {
      let dot = 0;
      for (let i = 0; i < row.length; i++) dot += row[i] * pc[i];
      const out = new Float64Array(row.length);
      for (let i = 0; i < row.length; i++) out[i] = row[i] - dot * pc[i];
      return out;
    });
  }

  let mat = centered;
  const coords = [[], [], []];
  for (let c = 0; c < 3; c++) {
    const pc = powerIteration(mat);
    coords[c] = project(mat, pc);
    mat = deflate(mat, pc);
  }

  return vectors.map((_, i) => [coords[0][i], coords[1][i], coords[2][i]]);
}

// ── cosine similarity ──
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) || 1);
}

// ── main ──
const args = process.argv.slice(2);
const isSearch = args[0] === "--search";

if (isSearch) {
  const query = args[1];
  const dirs = args.slice(2);
  if (!query || !dirs.length) { console.error("Usage: ozc embed --search \"<query>\" <dir> ..."); process.exit(1); }
  const files = scanFiles(dirs);
  const { vectors, vocabIdx } = tfidf(files);
  // vectorize query
  const qtokens = tokenize(query);
  const qvec = new Float64Array(Object.keys(vocabIdx).length);
  for (const t of qtokens) if (vocabIdx[t] !== undefined) qvec[vocabIdx[t]] = 1;
  let qnorm = 0; for (let i = 0; i < qvec.length; i++) qnorm += qvec[i]*qvec[i];
  qnorm = Math.sqrt(qnorm) || 1; for (let i = 0; i < qvec.length; i++) qvec[i] /= qnorm;

  const ranked = files.map((f, i) => ({ ...f, sim: cosine(vectors[i], qvec) }))
    .filter(r => r.sim > 0.01)
    .sort((a, b) => b.sim - a.sim);
  console.log(`\n  ${ranked.length} results for "${query}"\n`);
  for (const r of ranked.slice(0, 15)) {
    console.log(`  sim=${r.sim.toFixed(3)}  ${r.path}`);
    console.log(`         ${r.preview.slice(0, 100)}`);
    console.log();
  }
} else {
  // generate 3D data
  const dirs = args;
  if (!dirs.length) { console.error("Usage: ozc embed <dir> ...  (generates 3D visualization data)"); process.exit(1); }
  const files = scanFiles(dirs);
  console.log(`Scanned ${files.length} files`);
  const { vectors } = tfidf(files);
  console.log(`TF-IDF vectorized (${vectors[0]?.length || 0} dims)`);
  const coords = pca3d(vectors);
  console.log(`PCA reduced to 3D`);

  const output = files.map((f, i) => ({
    name: f.name, path: f.path, ext: f.ext, size: f.size,
    preview: f.preview.slice(0, 150),
    x: coords[i]?.[0] || 0, y: coords[i]?.[1] || 0, z: coords[i]?.[2] || 0,
  }));

  writeFileSync("docs/embed-data.json", JSON.stringify(output, null, 2));
  console.log(`Written docs/embed-data.json (${output.length} points)`);
  console.log(`Open docs/explore.html to view 3D visualization`);
}
