import fs from "fs";
import crypto from "crypto";
import path from "path";

const WASM_PATH = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm");

function main() {
  const bytes = fs.readFileSync(WASM_PATH);
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  console.log("File size:", bytes.length);
  console.log("SHA-256 Hash of prediction_market.wasm:", hash);
}

main();
