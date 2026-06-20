import {
  Keypair, rpc, TransactionBuilder, Operation,
  xdr, StrKey, Address, nativeToScVal, Account,
} from "@stellar/stellar-sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
const WASM_PATH = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm");

async function waitForTx(rpcServer: rpc.Server, hash: string): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  let getTx = await rpcServer.getTransaction(hash);
  while (getTx.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    getTx = await rpcServer.getTransaction(hash);
  }
  if (getTx.status !== "SUCCESS") {
    throw new Error(`Transaction failed: ${JSON.stringify(getTx)}`);
  }
  return getTx as rpc.Api.GetSuccessfulTransactionResponse;
}

async function sendAndConfirm(rpcServer: rpc.Server, tx: any, keypair: Keypair): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  // Simulate first
  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  // Build the final transaction with Soroban data
  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(keypair);

  // Submit
  const sendResult = await rpcServer.sendTransaction(preparedTx);
  if (sendResult.status === "ERROR") {
    const errStr = JSON.stringify(sendResult, (key, val) =>
      val && typeof val === 'object' && val._attributes ? '[XDR]' : val, 2);
    throw new Error(`Send error: ${errStr}`);
  }

  console.log(`  tx hash: ${sendResult.hash}`);
  return waitForTx(rpcServer, sendResult.hash);
}

async function main() {
  console.log("=== Deploy Prediction Market Contract ===\n");

  // 1. Setup keypair
  const envSecret = process.env.DEPLOYER_SECRET_KEY;
  const deployer = envSecret ? Keypair.fromSecret(envSecret) : Keypair.random();
  console.log(`Deployer: ${deployer.publicKey()}`);

  if (!envSecret) {
    console.log("Funding via Friendbot...");
    const resp = await fetch(`https://friendbot.stellar.org/?addr=${deployer.publicKey()}`);
    if (!resp.ok) throw new Error("Friendbot failed");
    console.log("Funded.\n");
  }

  // 2. Connect to RPC
  const server = new rpc.Server(RPC_URL);

  // 3. Apply binaryen fix to wasm
  console.log("Applying binaryen optimization to WASM...");
  const { default: binaryen } = await import("binaryen");
  const wasmBytes = new Uint8Array(fs.readFileSync(WASM_PATH));
  const binaryenModule = binaryen.readBinary(wasmBytes);
  binaryenModule.optimize();
  const fixedWasm = Buffer.from(binaryenModule.emitBinary());
  binaryenModule.dispose();
  const wasmTempPath = path.join(process.cwd(), "contracts", "target", "fixed_prediction_market.wasm");
  fs.writeFileSync(wasmTempPath, fixedWasm);
  console.log(`WASM optimized: ${wasmBytes.length} -> ${fixedWasm.length} bytes\n`);

  // 4. Upload WASM
  console.log("Step 1: Upload WASM...");
  const uploadOp = Operation.uploadContractWasm({ wasm: fixedWasm });

  // Get account from RPC server
  const account = await server.getAccount(deployer.publicKey());

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(300)
    .build();

  const uploadResult = await sendAndConfirm(server, tx, deployer);

  const txResult = uploadResult.resultXdr;
  const uploadHostFn = txResult.result().results()[0].tr().invokeHostFunctionResult();
  const wasmHash = uploadHostFn.success().toString("hex");
  console.log(`WASM hash: ${wasmHash}\n`);

  // 5. Deploy Contract
  console.log("Step 2: Deploy contract instance...");
  const deployOp = Operation.createCustomContract({
    address: Address.fromString(deployer.publicKey()),
    wasmHash: Buffer.from(wasmHash, "hex"),
  });

  const account2 = await server.getAccount(deployer.publicKey());
  let deployTx = new TransactionBuilder(account2, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(deployOp)
    .setTimeout(300)
    .build();

  const deployResult = await sendAndConfirm(server, deployTx, deployer);

  const deployResultXdr = deployResult.resultXdr;
  const deployHostFn = deployResultXdr.result().results()[0].tr().invokeHostFunctionResult().success();
  const contractId = StrKey.encodeContract(deployHostFn);

  console.log(`\n🎉 Contract deployed!`);
  console.log(`Contract ID: ${contractId}`);
  console.log(`Explorer: ${EXPLORER_URL}/contract/${contractId}`);

  // 6. Update .env
  const envPath = path.join(process.cwd(), ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ID=.*/, `NEXT_PUBLIC_CONTRACT_ID=${contractId}`);
  fs.writeFileSync(envPath, envContent);
  console.log(`\n✓ Updated .env with Contract ID`);
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err);
  process.exit(1);
});
