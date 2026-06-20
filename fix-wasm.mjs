import fs from "fs";
import binaryen from "binaryen";

const wasmPath = process.argv[2];
if (!wasmPath) {
  console.error("Usage: node fix-wasm.mjs <path-to-wasm>");
  process.exit(1);
}

const wasmBytes = new Uint8Array(fs.readFileSync(wasmPath));
const module = binaryen.readBinary(wasmBytes);

// Optimize to strip non-MVP features
module.optimize();
const newBytes = module.emitBinary();

fs.writeFileSync(wasmPath, Buffer.from(newBytes));
console.log(`Fixed wasm binary: ${wasmBytes.length} -> ${newBytes.length} bytes`);
module.dispose();
