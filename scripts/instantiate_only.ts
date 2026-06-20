import { Keypair, rpc, TransactionBuilder, Operation, StrKey, Address, Account } from "@stellar/stellar-sdk";
import fetch from "node-fetch";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet";
const WASM_HASH = "2cf7aef01fcfb36199133c9fd9bc51f9701926aef4fced6f17b15bc279d83fb3";

async function run() {
  console.log("=== Instantiating contract with pre-uploaded WASM ===");

  const deployerKeypair = Keypair.random();
  console.log(`Generated deployer keypair. Public Key: ${deployerKeypair.publicKey()}`);
  console.log("Funding keypair via Friendbot...");
  const response = await fetch(`https://friendbot.stellar.org/?addr=${deployerKeypair.publicKey()}`);
  if (!response.ok) throw new Error("Friendbot funding failed");
  console.log("✓ Funded successfully via Friendbot.");

  const rpcServer = new rpc.Server(RPC_URL);

  const accResponse = await fetch(`https://horizon-testnet.stellar.org/accounts/${deployerKeypair.publicKey()}`);
  if (!accResponse.ok) {
    console.error("Account not found");
    process.exit(1);
  }
  const accountData = await accResponse.json();
  const deployerAccount = new Account(deployerKeypair.publicKey(), accountData.sequence);

  console.log("Instantiating Contract...");
  const createContractOp = Operation.createCustomContract({
    address: Address.fromString(deployerKeypair.publicKey()),
    wasmHash: Buffer.from(WASM_HASH, "hex"),
  });

  let instantiateTx = new TransactionBuilder(deployerAccount, {
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
    if ('events' in instSimResult && Array.isArray(instSimResult.events)) {
      console.log("Events:", JSON.stringify(instSimResult.events, null, 2));
    }
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

  const instTxResult = instGetTx.resultXdr;
  const instInvokeResult = instTxResult.result().results()[0].tr().invokeHostFunctionResult().success();
  const contractId = StrKey.encodeContract(instInvokeResult);

  console.log(`\n🎉 Success! Contract Deployed! Contract ID: ${contractId}`);
}

run().catch((err) => {
  console.error("❌ Execution failed:", err);
});
