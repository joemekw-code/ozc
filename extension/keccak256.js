// Minimal keccak256 for browser (no dependencies)
// Source: adapted from https://github.com/nicolo-ribaudo/keccak256-js (public domain)

const ROUND_CONSTANTS = [
  1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n, 0x808bn, 0x80000001n,
  0x8000000080008081n, 0x8000000000008009n, 0x8an, 0x88n, 0x80008009n, 0x8000000an,
  0x8000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x80000001n, 0x8000000080008008n,
];

function keccakf(state) {
  for (let round = 0; round < 24; round++) {
    const C = new Array(5);
    for (let x = 0; x < 5; x++)
      C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    for (let x = 0; x < 5; x++) {
      const t = C[(x + 4) % 5] ^ (((C[(x + 1) % 5] << 1n) | (C[(x + 1) % 5] >> 63n)) & 0xffffffffffffffffn);
      for (let y = 0; y < 25; y += 5) state[y + x] ^= t;
    }
    let current = state[1];
    for (let i = 0; i < 24; i++) {
      const j = [10,7,11,17,18,3,5,16,8,21,24,4,15,23,19,13,12,2,20,14,22,9,6,1][i];
      const shift = BigInt([1,3,6,10,15,21,28,36,45,55,2,14,27,41,56,8,25,43,62,18,39,61,20,44][i]);
      const tmp = state[j];
      state[j] = ((current << shift) | (current >> (64n - shift))) & 0xffffffffffffffffn;
      current = tmp;
    }
    for (let y = 0; y < 25; y += 5) {
      const t = [state[y], state[y+1], state[y+2], state[y+3], state[y+4]];
      for (let x = 0; x < 5; x++)
        state[y + x] = t[x] ^ (~t[(x+1)%5] & t[(x+2)%5]);
    }
    state[0] ^= ROUND_CONSTANTS[round];
  }
}

function keccak256Bytes(input) {
  const rate = 136;
  const state = new Array(25).fill(0n);
  const padded = new Uint8Array(Math.ceil((input.length + 1) / rate) * rate);
  padded.set(input);
  padded[input.length] = 0x01;
  padded[padded.length - 1] |= 0x80;

  for (let offset = 0; offset < padded.length; offset += rate) {
    for (let i = 0; i < rate; i += 8) {
      const idx = (i >> 3);
      let val = 0n;
      for (let b = 0; b < 8; b++) val |= BigInt(padded[offset + i + b]) << BigInt(b * 8);
      state[idx] ^= val;
    }
    keccakf(state);
  }

  const hash = new Uint8Array(32);
  for (let i = 0; i < 4; i++) {
    for (let b = 0; b < 8; b++) hash[i * 8 + b] = Number((state[i] >> BigInt(b * 8)) & 0xffn);
  }
  return hash;
}

// Export for use in content.js and popup
window.ozcKeccak256 = function(text) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const hash = keccak256Bytes(bytes);
  return "0x" + [...hash].map(b => b.toString(16).padStart(2, "0")).join("");
};
