import { Keypair, rpc, TransactionBuilder, Operation, Account, xdr } from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";

async function main() {
  const WASM_PATH = path.join(process.cwd(), "contracts", "target", "wasm32-unknown-unknown", "release", "prediction_market.wasm");
  const deployer = Keypair.random();

  console.log("Funding...");
  const resp = await fetch(`https://friendbot.stellar.org/?addr=${deployer.publicKey()}`);
  await resp.json();

  const server = new rpc.Server("https://soroban-testnet.stellar.org");

  const accResp = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployer.publicKey()}`);
  const accData = await accResp.json();

  const account = new Account(deployer.publicKey(), accData.sequence);
  const wasm = fs.readFileSync(WASM_PATH);
  const op = Operation.uploadContractWasm({ wasm });

  let tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: "Test SDF Network ; October 2013",
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);

  console.log("transactionData type:", typeof sim.transactionData);
  console.log("transactionData:", sim.transactionData?.substring?.(0, 80) || sim.transactionData);
  console.log("minResourceFee:", sim.minResourceFee);

  // Check if SorobanDataBuilder is involved
  console.log("\nFull sim keys:", Object.keys(sim));
}

main().catch(e => console.error(e));
