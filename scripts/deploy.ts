import {
  Keypair, rpc, TransactionBuilder, Operation,
  xdr, StrKey, Address, Account,
} from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

// Helper to load .env manually
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    }
  }
}

async function waitForTx(server: rpc.Server, hash: string) {
  let getTx = await server.getTransaction(hash);
  while (getTx.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    getTx = await server.getTransaction(hash);
  }
  if (getTx.status !== "SUCCESS") {
    throw new Error(`Transaction failed: ${JSON.stringify(getTx)}`);
  }
  return getTx;
}

// Simulates a transaction on the RPC server with auto-retry if the target WASM/contract is not yet synced.
async function simulateWithRetry(
  server: rpc.Server,
  tx: any,
  description: string
): Promise<rpc.Api.SimulateTransactionSuccessResponse> {
  let retries = 0;
  const maxRetries = 20;
  while (retries < maxRetries) {
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      const errMsg = JSON.stringify(sim.error);
      if (
        errMsg.includes("Wasm does not exist") ||
        errMsg.includes("MissingValue") ||
        errMsg.includes("ContractNotFound") ||
        errMsg.includes("not found")
      ) {
        console.log(`  [Retry ${retries + 1}/${maxRetries}] Simulation target not yet synced on RPC node (${description}). Error: ${errMsg}. Waiting 5s...`);
        await new Promise((r) => setTimeout(r, 5000));
        retries++;
        continue;
      }
      throw new Error(`${description} simulation failed: ${errMsg}`);
    }
    return sim as rpc.Api.SimulateTransactionSuccessResponse;
  }
  throw new Error(`${description} simulation timed out after ${maxRetries} retries`);
}

async function main() {
  console.log("=== Loading configuration ===");
  loadEnv();

  const envSecret = process.env.DEPLOYER_SECRET_KEY;
  if (!envSecret) {
    console.error("❌ Error: DEPLOYER_SECRET_KEY is missing from environment.");
    console.error("Please set it in your environment or in the .env file.");
    process.exit(1);
  }

  const deployer = Keypair.fromSecret(envSecret);
  const publicKey = deployer.publicKey();
  console.log(`✓ Deployer key loaded. Public Key: ${publicKey}`);

  // Check balance and fund if needed
  console.log("Checking deployer balance...");
  const server = new rpc.Server(RPC_URL);
  
  let balance = 0;
  let accountExists = false;
  try {
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (res.ok) {
      accountExists = true;
      const data = await res.json();
      const nativeBalance = data.balances.find((b: any) => b.asset_type === "native");
      balance = parseFloat(nativeBalance?.balance || "0");
      console.log(`Deployer balance: ${balance} XLM`);
    } else {
      console.log("Deployer account does not exist on Testnet.");
    }
  } catch (err) {
    console.warn("Could not query Horizon. Assuming account needs funding.");
  }

  if (!accountExists || balance < 10) {
    console.log(`Balance is low (< 10 XLM) or account does not exist. Funding via Friendbot...`);
    try {
      const fbRes = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (!fbRes.ok) {
        throw new Error(`Friendbot returned status ${fbRes.status}`);
      }
      console.log("✓ Funded successfully via Friendbot.");
    } catch (err) {
      console.error("❌ Failed to fund deployer keypair via Friendbot.");
      console.error(`Please fund manually at: https://friendbot.stellar.org/?addr=${publicKey}`);
      process.exit(1);
    }
  }

  // Compile Contracts
  console.log("\n=== Compiling Contracts ===");
  try {
    console.log("Compiling contracts using GNU toolchain...");
    execSync("rustup run stable-x86_64-pc-windows-gnu cargo build --target wasm32-unknown-unknown --release", {
      cwd: path.join(process.cwd(), "contracts"),
      stdio: "inherit",
    });
    console.log("✓ Compilation completed successfully using GNU toolchain.");
  } catch (err) {
    console.log("⚠ GNU compilation failed or not available. Trying default cargo build...");
    try {
      execSync("cargo build --target wasm32-unknown-unknown --release", {
        cwd: path.join(process.cwd(), "contracts"),
        stdio: "inherit",
      });
      console.log("✓ Compilation completed successfully.");
    } catch (defaultBuildErr) {
      console.error("❌ Compilation failed.");
      process.exit(1);
    }
  }

  // Helper for deploying a contract
  async function deployWasm(wasmName: string, wasmFileBasename: string): Promise<{ contractId: string; wasmUploadHash: string; wasmInstantiateHash: string }> {
    console.log(`\n--- Deploying ${wasmFileBasename} ---`);
    const rawWasmPath = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", wasmName);
    
    if (!fs.existsSync(rawWasmPath)) {
      throw new Error(`Could not find compiled WASM file at ${rawWasmPath}`);
    }

    console.log("Optimizing WASM with binaryen...");
    const { default: binaryen } = await import("binaryen");
    const wasmBytes = new Uint8Array(fs.readFileSync(rawWasmPath));
    const bm = binaryen.readBinary(wasmBytes);
    bm.optimize();
    const optimizedWasm = Buffer.from(bm.emitBinary());
    bm.dispose();
    console.log(`Optimized WASM size: ${wasmBytes.length} -> ${optimizedWasm.length} bytes`);

    const getSeq = async () => {
      const r = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
      if (!r.ok) throw new Error("Failed to get sequence number");
      return (await r.json()).sequence;
    };

    console.log("Step 1: Uploading WASM...");
    const seq1 = await getSeq();
    const acct1 = new Account(publicKey, seq1);
    const uploadOp = Operation.uploadContractWasm({ wasm: optimizedWasm });

    let tx1 = new TransactionBuilder(acct1, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(uploadOp)
      .setTimeout(300)
      .build();

    const sim1 = await simulateWithRetry(server, tx1, `${wasmFileBasename} upload`);

    const finalTx1 = rpc.assembleTransaction(tx1, sim1).build();
    finalTx1.sign(deployer);
    
    console.log("  Submitting upload tx...");
    const send1 = await server.sendTransaction(finalTx1);
    if (send1.status === "ERROR") {
      throw new Error(`Upload send failed: ${JSON.stringify(send1, null, 2)}`);
    }

    console.log(`  Waiting for upload tx confirmation (Hash: ${send1.hash})...`);
    await waitForTx(server, send1.hash);
    const wasmHash = crypto.createHash("sha256").update(optimizedWasm).digest("hex");
    console.log(`  WASM Uploaded. Hash: ${wasmHash}`);

    console.log("Step 2: Instantiating Contract...");
    const seq2 = await getSeq();
    const acct2 = new Account(publicKey, seq2);
    const deployOp = Operation.createCustomContract({
      address: Address.fromString(publicKey),
      wasmHash: Buffer.from(wasmHash, "hex"),
    });

    let tx2 = new TransactionBuilder(acct2, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(deployOp)
      .setTimeout(300)
      .build();

    const sim2 = await simulateWithRetry(server, tx2, `${wasmFileBasename} instantiation`);

    const finalTx2 = rpc.assembleTransaction(tx2, sim2).build();
    finalTx2.sign(deployer);
    
    console.log("  Submitting instantiation tx...");
    const send2 = await server.sendTransaction(finalTx2);
    if (send2.status === "ERROR") {
      throw new Error(`Instantiation send failed: ${JSON.stringify(send2, null, 2)}`);
    }

    console.log(`  Waiting for instantiation tx confirmation (Hash: ${send2.hash})...`);
    const get2 = await waitForTx(server, send2.hash);
    const contractId = StrKey.encodeContract(get2.resultXdr.result().results()[0].tr().invokeHostFunctionResult().success());
    
    return {
      contractId,
      wasmUploadHash: send1.hash,
      wasmInstantiateHash: send2.hash,
    };
  }

  // 1. Deploy Prediction Market
  const pmResult = await deployWasm("prediction_market.wasm", "PredictionMarket_Contract");
  console.log(`🎉 PredictionMarket_Contract Deployed!`);
  console.log(`   Contract ID: ${pmResult.contractId}`);
  console.log(`   Upload Tx Hash: ${pmResult.wasmUploadHash}`);
  console.log(`   Instantiation Tx Hash: ${pmResult.wasmInstantiateHash}`);

  // 2. Deploy Oracle
  const oracleResult = await deployWasm("oracle.wasm", "Oracle_Contract");
  console.log(`🎉 Oracle_Contract Deployed!`);
  console.log(`   Contract ID: ${oracleResult.contractId}`);
  console.log(`   Upload Tx Hash: ${oracleResult.wasmUploadHash}`);
  console.log(`   Instantiation Tx Hash: ${oracleResult.wasmInstantiateHash}`);

  // 3. Initialize Oracle Contract
  console.log("\nStep 3: Initializing Oracle Contract with Admin address...");
  console.log("  Waiting 15 seconds for RPC ledger state to sync oracle instance...");
  await new Promise((r) => setTimeout(r, 15000));

  const getSeq = async () => {
    const r = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    if (!r.ok) throw new Error("Failed to get sequence number");
    return (await r.json()).sequence;
  };
  const seq3 = await getSeq();
  const acct3 = new Account(publicKey, seq3);

  const contractAddress = new Address(oracleResult.contractId);
  const invokeArgs = xdr.InvokeContractArgs.fromXDR(
    xdr.InvokeContractArgs.toXDR(
      new xdr.InvokeContractArgs({
        contractAddress: contractAddress.toScAddress(),
        functionName: "init",
        args: [new Address(publicKey).toScVal()],
      })
    )
  );

  const initOp = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeInvokeContract(invokeArgs),
    auth: [],
  });

  let tx3 = new TransactionBuilder(acct3, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(initOp)
    .setTimeout(300)
    .build();

  const sim3 = await simulateWithRetry(server, tx3, "Oracle initialization");

  const finalTx3 = rpc.assembleTransaction(tx3, sim3).build();
  finalTx3.sign(deployer);
  
  console.log("  Submitting init tx...");
  const send3 = await server.sendTransaction(finalTx3);
  if (send3.status === "ERROR") {
    throw new Error(`Oracle init send failed: ${JSON.stringify(send3, null, 2)}`);
  }
  console.log(`  Waiting for init tx confirmation (Hash: ${send3.hash})...`);
  await waitForTx(server, send3.hash);
  console.log(`✓ Oracle initialized with admin: ${publicKey}`);

  // 4. Update .env files
  console.log("\nUpdating configuration files...");
  const updateEnvFile = (filePath: string) => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf8");
      
      // Update or insert NEXT_PUBLIC_CONTRACT_ID
      if (content.includes("NEXT_PUBLIC_CONTRACT_ID=")) {
        content = content.replace(/NEXT_PUBLIC_CONTRACT_ID=.*/, `NEXT_PUBLIC_CONTRACT_ID=${pmResult.contractId}`);
      } else {
        content += `\nNEXT_PUBLIC_CONTRACT_ID=${pmResult.contractId}`;
      }

      // Update or insert NEXT_PUBLIC_ORACLE_CONTRACT_ID
      if (content.includes("NEXT_PUBLIC_ORACLE_CONTRACT_ID=")) {
        content = content.replace(/NEXT_PUBLIC_ORACLE_CONTRACT_ID=.*/, `NEXT_PUBLIC_ORACLE_CONTRACT_ID=${oracleResult.contractId}`);
      } else {
        content += `\nNEXT_PUBLIC_ORACLE_CONTRACT_ID=${oracleResult.contractId}`;
      }

      fs.writeFileSync(filePath, content);
      console.log(`✓ Updated ${path.basename(filePath)}`);
    }
  };

  updateEnvFile(path.join(process.cwd(), ".env"));
  updateEnvFile(path.join(process.cwd(), ".env.production"));

  console.log("\n=== Deployed Addresses ===");
  console.log(`Prediction Market ID: ${pmResult.contractId}`);
  console.log(`Oracle ID:            ${oracleResult.contractId}`);
}

main().catch((err) => {
  console.error("\n❌ Deployment failed:", err);
  process.exit(1);
});
