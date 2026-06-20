import { Keypair, rpc, TransactionBuilder, Operation, Account } from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";

async function main() {
  const keypair = Keypair.random();
  const pubKey = keypair.publicKey();
  console.log("Generated keypair:", pubKey);

  // Fund
  console.log("Funding...");
  const resp = await fetch(`https://friendbot.stellar.org/?addr=${pubKey}`);
  const fundData = await resp.json();
  console.log("Funded, sequence:", fundData._embedded?.records?.[0]?.sequence);

  // Fetch account from Horizon
  const accResp = await fetch(`https://horizon-testnet.stellar.org/accounts/${pubKey}`);
  const accData = await accResp.json();
  console.log("Horizon sequence:", accData.sequence);
  console.log("Horizon balances:", JSON.stringify(accData.balances));

  // Build transaction
  const sequence = accData.sequence;
  const account = new Account(pubKey, sequence);
  const wasmBytes = fs.readFileSync(path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm"));

  const op = Operation.uploadContractWasm({ wasm: wasmBytes });
  const tx = new TransactionBuilder(account, {
    fee: "10000000",
    networkPassphrase: "Test SDF Network ; October 2013",
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  console.log("\nTransaction info:");
  console.log("Source:", tx.source);
  console.log("Sequence:", tx.sequenceNumber);
  console.log("Operations:", tx.operations.length);
  console.log("Fee:", tx.fee);

  // Check operations
  tx.operations.forEach((op2, i) => {
    console.log(`Op ${i}:`, JSON.stringify(op2, (k, v) => {
      if (k === 'wasm' && v) return `[wasm ${v.length}]`;
      return v;
    }, 2));
  });

  // Simulate
  const server = new rpc.Server("https://soroban-testnet.stellar.org");
  console.log("\nSimulating...");
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    console.log("Simulation error:", sim.error);
    return;
  }
  console.log("Simulation success");

  // Assemble
  const assembled = rpc.assembleTransaction(tx, sim).build();
  console.log("\nAssembled transaction:");
  console.log("Source:", assembled.source);
  console.log("Sequence:", assembled.sequenceNumber);
  console.log("Fee:", assembled.fee);

  // Sign
  assembled.sign(keypair);

  // Check the signature
  const env = assembled.toEnvelope();
  console.log("\nEnvelope type:", env._switch?.name || env.switch?.());
  console.log("Signatures count:", assembled.signatures.length);

  // Submit
  console.log("\nSubmitting...");
  const result = await server.sendTransaction(assembled);
  console.log("Send result status:", result.status);
  if (result.status === "ERROR") {
    console.log("Error hash:", result.hash);
    if (result.errorResult) {
      const err = result.errorResult;
      const switchInfo = err._attributes?.result?._attributes?._switch || err.result?.switch?.();
      console.log("Error code:", switchInfo?.name || switchInfo?.value || switchInfo);
    }
  }
}

main().catch(e => console.error(e));
