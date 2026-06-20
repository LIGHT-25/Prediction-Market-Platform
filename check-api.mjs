import { Operation, Keypair } from "@stellar/stellar-sdk";

const kp = Keypair.random();
const wasm = Buffer.alloc(10, 0);
const op = Operation.uploadContractWasm({ wasm });
console.log("Op type:", op.type);
console.log("Op keys:", Object.keys(op));
