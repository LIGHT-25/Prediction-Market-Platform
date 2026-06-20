import {
  Keypair, rpc, TransactionBuilder, Operation,
  xdr, StrKey, Address, Account,
} from "@stellar/stellar-sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
const WASM_PATH = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm");

async function waitForTx(rpcServer: rpc.Server, hash: string) {
  let getTx = await rpcServer.getTransaction(hash);
  while (getTx.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    getTx = await rpcServer.getTransaction(hash);
  }
  if (getTx.status !== "SUCCESS") throw new Error(`TX failed: ${JSON.stringify(getTx)}`);
  return getTx;
}

async function sendSorobanTx(
  server: rpc.Server,
  tx: any,
  sim: rpc.Api.SimulateTransactionSuccessResponse,
  keypair: Keypair,
) {
  // Manually apply Soroban data from simulation to the transaction
  const txData = sim.transactionData;
  const minFee = sim.minResourceFee ? Number(sim.minResourceFee) : 0;
  const baseFee = Number(tx.fee) || 100000;

  // Build a new transaction envelope with Soroban data
  const source = tx.source;
  const seqNum = tx.sequenceNumber;

  const sorobanData = xdr.SorobanTransactionData.fromXDR(txData, "base64");
  const ext = xdr.TransactionExt.v1(sorobanData);

  const envelope = tx.toEnvelope().v1();

  const newTx = new xdr.TransactionEnvelope.envelopeTypeTx(
    new xdr.TransactionV1Envelope({
      tx: new xdr.Transaction({
        sourceAccount: envelope.tx().sourceAccount(),
        fee: xdr.Int64.fromString(String(baseFee + minFee)),
        seqNum: envelope.tx().seqNum(),
        cond: envelope.tx().cond(),
        memo: envelope.tx().memo(),
        operations: envelope.tx().operations(),
        ext,
      }),
      signatures: [],
    }),
  );

  // Create a new Transaction from the envelope and sign it
  const { Transaction } = await import("@stellar/stellar-sdk");
  const finalTx = new Transaction(newTx, NETWORK_PASSPHRASE);
  finalTx.sign(keypair);

  // Submit
  const result = await server.sendTransaction(finalTx);
  if (result.status === "ERROR") {
    throw new Error(`Send error: ${result.status}, hash: ${result.hash}`);
  }

  return waitForTx(server, result.hash);
}

async function main() {
  console.log("=== Deploy Prediction Market Contract ===\n");

  // Apply binaryen to wasm
  console.log("Optimizing WASM with binaryen...");
  const { default: binaryen } = await import("binaryen");
  const wasmBytes = new Uint8Array(fs.readFileSync(WASM_PATH));
  const bModule = binaryen.readBinary(wasmBytes);
  bModule.optimize();
  const fixedWasm = Buffer.from(bModule.emitBinary());
  bModule.dispose();
  const useWasm = path.join(process.cwd(), "contracts", "target", "fixed.wasm");
  fs.writeFileSync(useWasm, fixedWasm);
  console.log(`  ${wasmBytes.length} -> ${fixedWasm.length} bytes\n`);

  // Setup deployer
  const envSecret = process.env.DEPLOYER_SECRET_KEY;
  const deployer = envSecret ? Keypair.fromSecret(envSecret) : Keypair.random();
  console.log(`Deployer: ${deployer.publicKey()}`);

  if (!envSecret) {
    console.log("Funding via Friendbot...");
    const resp = await fetch(`https://friendbot.stellar.org/?addr=${deployer.publicKey()}`);
    if (!resp.ok) throw new Error("Friendbot failed");
    console.log("Funded.\n");
  }

  const server = new rpc.Server(RPC_URL);

  // Get account from Horizon
  let accResp = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployer.publicKey()}`);
  let accData = await accResp.json();
  const startSeq = accData.sequence;
  console.log(`Starting sequence: ${startSeq}\n`);

  // === UPLOAD WASM ===
  console.log("Step 1: Upload WASM...");
  const account1 = new Account(deployer.publicKey(), startSeq);
  const uploadOp = Operation.uploadContractWasm({ wasm: fixedWasm });
  let tx1 = new TransactionBuilder(account1, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(300)
    .build();

  const sim1 = await server.simulateTransaction(tx1);
  if (rpc.Api.isSimulationError(sim1)) throw new Error(`Sim error: ${sim1.error}`);

  const uploadResult = await sendSorobanTx(server, tx1, sim1, deployer);
  const uploadHostFn = uploadResult.resultXdr.result().results()[0].tr().invokeHostFunctionResult();
  const wasmHash = uploadHostFn.success().toString("hex");
  console.log(`WASM hash: ${wasmHash}\n`);

  // === DEPLOY CONTRACT ===
  console.log("Step 2: Deploy contract instance...");
  accResp = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployer.publicKey()}`);
  accData = await accResp.json();
  const account2 = new Account(deployer.publicKey(), accData.sequence);

  const deployOp = Operation.createCustomContract({
    address: Address.fromString(deployer.publicKey()),
    wasmHash: Buffer.from(wasmHash, "hex"),
  });
  let tx2 = new TransactionBuilder(account2, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(deployOp)
    .setTimeout(300)
    .build();

  const sim2 = await server.simulateTransaction(tx2);
  if (rpc.Api.isSimulationError(sim2)) throw new Error(`Sim error: ${sim2.error}`);

  const deployResult = await sendSorobanTx(server, tx2, sim2, deployer);
  const deployHostFn = deployResult.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success();
  const contractId = StrKey.encodeContract(deployHostFn);

  console.log(`\n🎉 Contract deployed!`);
  console.log(`Contract ID: ${contractId}`);
  console.log(`Explorer: ${EXPLORER_URL}/contract/${contractId}`);

  // Update .env
  const envPath = path.join(process.cwd(), ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ID=.*/, `NEXT_PUBLIC_CONTRACT_ID=${contractId}`);
  fs.writeFileSync(envPath, envContent);
  console.log(`\n✓ Updated .env`);
}

main().catch((err) => {
  console.error("\n❌ Failed:", err);
  process.exit(1);
});
