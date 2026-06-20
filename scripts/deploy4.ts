import {
  Keypair, rpc, TransactionBuilder, Operation,
  xdr, StrKey, Address, Account,
} from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
const WASM_PATH = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm");

async function main() {
  console.log("=== Deploy Prediction Market Contract ===\n");

  // Optimize WASM
  console.log("Optimizing WASM...");
  const { default: binaryen } = await import("binaryen");
  const wasmBytes = new Uint8Array(fs.readFileSync(WASM_PATH));
  const bm = binaryen.readBinary(wasmBytes);
  bm.optimize();
  const fixedWasm = Buffer.from(bm.emitBinary());
  bm.dispose();
  console.log(`  ${wasmBytes.length} -> ${fixedWasm.length} bytes\n`);

  // Setup keypair
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

  async function getSeq() {
    const r = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployer.publicKey()}`);
    return (await r.json()).sequence;
  }

  // === UPLOAD ===
  console.log("Step 1: Upload WASM...");
  const seq1 = await getSeq();
  const acct1 = new Account(deployer.publicKey(), seq1);
  const uploadOp = Operation.uploadContractWasm({ wasm: fixedWasm });

  // Build and simulate
  let tx1 = new TransactionBuilder(acct1, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(300)
    .build();

  const sim1 = await server.simulateTransaction(tx1);
  if (rpc.Api.isSimulationError(sim1)) throw new Error(`Sim error: ${sim1.error}`);

  // Build a new tx with Soroban data from simulation
  const totalFee1 = 100000 + Number(sim1.minResourceFee || 0);

  // Use our own refreshed account for sequence
  const acct1b = new Account(deployer.publicKey(), seq1);

  let finalTx1 = new TransactionBuilder(acct1b, {
    fee: String(totalFee1),
    networkPassphrase: NETWORK_PASSPHRASE,
    sorobanData: sim1.transactionData.build(),
  })
    .addOperation(uploadOp)
    .setTimeout(300)
    .build();

  finalTx1.sign(deployer);

  console.log("  Submitting...");
  const send1 = await server.sendTransaction(finalTx1);
  if (send1.status === "ERROR") throw new Error(`Upload send error: ${JSON.stringify(send1, null, 2)}`);

  console.log("  Waiting for confirmation...");
  let get1 = await server.getTransaction(send1.hash);
  while (get1.status === "NOT_FOUND") { await new Promise(r => setTimeout(r, 2000)); get1 = await server.getTransaction(send1.hash); }
  if (get1.status !== "SUCCESS") throw new Error(`Upload failed: ${JSON.stringify(get1)}`);

  const wasmHash = get1.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success().toString("hex");
  console.log(`  WASM hash: ${wasmHash}\n`);

  // === DEPLOY ===
  console.log("Step 2: Deploy contract instance...");
  const seq2 = await getSeq();
  const acct2 = new Account(deployer.publicKey(), seq2);

  const deployOp = Operation.createCustomContract({
    address: Address.fromString(deployer.publicKey()),
    wasmHash: Buffer.from(wasmHash, "hex"),
  });

  let tx2 = new TransactionBuilder(acct2, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(deployOp)
    .setTimeout(300)
    .build();

  const sim2 = await server.simulateTransaction(tx2);
  if (rpc.Api.isSimulationError(sim2)) throw new Error(`Deploy sim error: ${sim2.error}`);

  const totalFee2 = 100000 + Number(sim2.minResourceFee || 0);

  const acct2b = new Account(deployer.publicKey(), seq2);

  let finalTx2 = new TransactionBuilder(acct2b, {
    fee: String(totalFee2),
    networkPassphrase: NETWORK_PASSPHRASE,
    sorobanData: sim2.transactionData.build(),
  })
    .addOperation(deployOp)
    .setTimeout(300)
    .build();

  finalTx2.sign(deployer);

  console.log("  Submitting...");
  const send2 = await server.sendTransaction(finalTx2);
  if (send2.status === "ERROR") throw new Error(`Deploy send error: ${send2.status}`);

  console.log("  Waiting for confirmation...");
  let get2 = await server.getTransaction(send2.hash);
  while (get2.status === "NOT_FOUND") { await new Promise(r => setTimeout(r, 2000)); get2 = await server.getTransaction(send2.hash); }
  if (get2.status !== "SUCCESS") throw new Error(`Deploy failed: ${JSON.stringify(get2)}`);

  const contractId = StrKey.encodeContract(get2.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success());

  console.log(`\n🎉 Contract ID: ${contractId}`);
  console.log(`   ${EXPLORER_URL}/contract/${contractId}`);

  // Update .env
  const envPath = path.join(process.cwd(), ".env");
  let env = fs.readFileSync(envPath, "utf8");
  env = env.replace(/NEXT_PUBLIC_CONTRACT_ID=.*/, `NEXT_PUBLIC_CONTRACT_ID=${contractId}`);
  fs.writeFileSync(envPath, env);
  console.log("   ✓ Updated .env");
}

main().catch(e => { console.error("\n❌", e); process.exit(1); });
