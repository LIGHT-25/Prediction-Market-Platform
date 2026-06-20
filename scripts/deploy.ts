import { Keypair, rpc, TransactionBuilder, Operation, xdr, StrKey, Address, Account } from "@stellar/stellar-sdk";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import crypto from "crypto";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

async function run() {
  console.log("=== Stellar Prediction Market Contract Deployment ===");

  // 1. Compile Contract
  const wasmName = "prediction_market.wasm";
  let wasmPath = "";

  try {
    console.log("1. Attempting to compile contract...");
    execSync("cargo build --target wasm32-unknown-unknown --release", {
      cwd: path.join(process.cwd(), "contracts"),
      stdio: "inherit",
    });
    console.log("✓ Compilation completed successfully.");
    wasmPath = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", wasmName);
  } catch (error) {
    console.log("⚠ Cargo build failed. Looking for precompiled WASM in target directories...");
    const targetPaths = [
      path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", wasmName),
      path.join(process.cwd(), "target", "wasm32-unknown-unknown", "release", wasmName),
      path.join(process.cwd(), wasmName)
    ];

    for (const p of targetPaths) {
      if (fs.existsSync(p)) {
        wasmPath = p;
        console.log(`✓ Found precompiled WASM at: ${p}`);
        break;
      }
    }
  }

  if (!wasmPath || !fs.existsSync(wasmPath)) {
    console.error("\n❌ Error: Could not find prediction_market.wasm.");
    console.error("Please make sure you build the contract first using:");
    console.error("  cd contracts && cargo build --target wasm32-unknown-unknown --release\n");
    process.exit(1);
  }

  // 2. Setup Deployer Keypair
  console.log("2. Setting up deployer keypair...");
  let deployerKeypair: Keypair;
  const envSecret = process.env.DEPLOYER_SECRET_KEY;

  if (envSecret) {
    deployerKeypair = Keypair.fromSecret(envSecret);
    console.log(`✓ Using configured secret key. Public Key: ${deployerKeypair.publicKey()}`);
  } else {
    deployerKeypair = Keypair.random();
    console.log(`Generated random keypair. Public Key: ${deployerKeypair.publicKey()}`);
    console.log("Funding keypair via Friendbot...");
    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${deployerKeypair.publicKey()}`);
      if (!response.ok) throw new Error("Friendbot funding failed");
      console.log("✓ Funded successfully via Friendbot.");
    } catch (err) {
      console.error("❌ Failed to fund deployer keypair. Please fund manually or check internet connection.");
      process.exit(1);
    }
  }

  // 3. Connect to RPC and fetch Account info
  console.log("3. Connecting to Soroban RPC...");
  const rpcServer = new rpc.Server(RPC_URL);
  
  // Load account to obtain sequence number
  const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployerKeypair.publicKey()}`);
  if (!response.ok) {
    console.error(`❌ Account ${deployerKeypair.publicKey()} not found on Testnet.`);
    process.exit(1);
  }
  const accountData = await response.json();
  const deployerAccount = new Account(deployerKeypair.publicKey(), accountData.sequence);

  // 4. Upload WASM Bytecode
  console.log("4. Uploading WASM bytecode...");
  const wasmBytes = fs.readFileSync(wasmPath);
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });

  let tx = new TransactionBuilder(deployerAccount, {
    fee: "10000000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(600)
    .build();

  console.log("Simulating upload transaction...");
  let simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    console.error("❌ Upload simulation failed:", simResult.error);
    process.exit(1);
  }

  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(deployerKeypair);

  console.log("Submitting upload transaction...");
  let sendResult = await rpcServer.sendTransaction(preparedTx);

  // Decode error result if present
  if (sendResult.status === "ERROR") {
    try {
      const errResult = sendResult.errorResult;
      if (errResult && errResult.result?._attributes?.result?._attributes) {
        const code = errResult.result._attributes.result._attributes.code;
        console.error("❌ Transaction error code:", code);
      }
    } catch {}
    console.error("❌ Full send error:", JSON.stringify(sendResult, null, 2));
    process.exit(1);
  }

  console.log(`Waiting for upload transaction to finalize (Hash: ${sendResult.hash})...`);
  let getTx = await rpcServer.getTransaction(sendResult.hash);
  while (getTx.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    getTx = await rpcServer.getTransaction(sendResult.hash);
  }

  if (getTx.status !== "SUCCESS") {
    console.error("❌ Transaction failed to finalize:", getTx);
    process.exit(1);
  }

  const txResult = getTx.resultXdr;
  const invokeHostFnResult = txResult.result().results()[0].tr().invokeHostFunctionResult();
  const successVal = invokeHostFnResult.success();
  const localWasmHash = crypto.createHash("sha256").update(wasmBytes).digest("hex");
  console.log(`✓ WASM uploaded successfully. WASM Hash: ${localWasmHash}`);
  console.log(`Explorer Link: ${EXPLORER_URL}/tx/${sendResult.hash}`);

  // Update account sequence number
  const nextSeq = (BigInt(accountData.sequence) + BigInt(1)).toString();
  const deployerAccountUpdated = new Account(deployerKeypair.publicKey(), nextSeq);

  console.log("Waiting 10 seconds for RPC node/ledger to sync...");
  await new Promise((r) => setTimeout(r, 10000));

  // 5. Instantiate Contract
  console.log("5. Instantiating Contract...");
  const createContractOp = Operation.createCustomContract({
    address: Address.fromString(deployerKeypair.publicKey()),
    wasmHash: Buffer.from(localWasmHash, "hex"),
  });

  let instantiateTx = new TransactionBuilder(deployerAccountUpdated, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(createContractOp)
    .setTimeout(600)
    .build();

  console.log("Simulating instantiation transaction...");
  let instSimResult = await rpcServer.simulateTransaction(instantiateTx);
  if (rpc.Api.isSimulationError(instSimResult)) {
    console.error("❌ Instantiation simulation failed:", instSimResult.error);
    process.exit(1);
  }

  const preparedInstantiateTx = rpc.assembleTransaction(instantiateTx, instSimResult).build();
  preparedInstantiateTx.sign(deployerKeypair);

  console.log("Submitting instantiation transaction...");
  let instSendResult = await rpcServer.sendTransaction(preparedInstantiateTx);
  if (instSendResult.status === "ERROR") {
    console.error("❌ Instantiation send transaction error:", instSendResult);
    process.exit(1);
  }

  console.log(`Waiting for instantiation transaction to finalize (Hash: ${instSendResult.hash})...`);
  let instGetTx = await rpcServer.getTransaction(instSendResult.hash);
  while (instGetTx.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    instGetTx = await rpcServer.getTransaction(instSendResult.hash);
  }

  if (instGetTx.status !== "SUCCESS") {
    console.error("❌ Instantiation transaction failed:", instGetTx);
    process.exit(1);
  }

  const meta = xdr.TransactionMeta.fromXDR(instGetTx.resultMetaXdr.toXDR("base64"), "base64");
  let contractId = "";
  if (meta.switch().name === "txMetaV4" || meta.switch().value === 4) {
    const sorobanMeta = meta.v4().sorobanMeta();
    if (sorobanMeta && sorobanMeta.returnValue()) {
      contractId = Address.fromScAddress(sorobanMeta.returnValue()).toString();
    }
  }

  if (!contractId) {
    const instTxResult = instGetTx.resultXdr;
    const instInvokeResult = instTxResult.result().results()[0].tr().invokeHostFunctionResult().success();
    contractId = StrKey.encodeContract(instInvokeResult);
  }

  console.log(`\n🎉 Success! Prediction Market Contract Deployed!`);
  console.log(`Contract ID: ${contractId}`);
  console.log(`Explorer Link: ${EXPLORER_URL}/contract/${contractId}`);

  // 6. Update .env file
  console.log("\n6. Updating configuration...");
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ID=")) {
      envContent = envContent.replace(/NEXT_PUBLIC_CONTRACT_ID=.*/, `NEXT_PUBLIC_CONTRACT_ID=${contractId}`);
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ID=${contractId}`;
    }
    fs.writeFileSync(envPath, envContent);
    console.log("✓ Updated contract ID in .env file.");
  } else {
    fs.writeFileSync(envPath, `NEXT_PUBLIC_CONTRACT_ID=${contractId}\n`);
    console.log("✓ Created .env file with contract ID.");
  }

  console.log("\nDeployment completed successfully!");
}

run().catch((err) => {
  console.error("❌ Deployment failed with error:", err);
  process.exit(1);
});
