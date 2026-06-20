import { rpc, xdr } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const WASM_HASH = "0bee37a1f6afe18b9c62b69d357ac940055ba41fccfae8797d13e62aba586010";

async function run() {
  const rpcServer = new rpc.Server(RPC_URL);
  
  const ledgerKey = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: Buffer.from(WASM_HASH, "hex"),
    })
  );

  console.log("Querying ledger entry for WASM hash...");
  const response = await rpcServer.getLedgerEntries(ledgerKey);
  console.log("Response:", JSON.stringify(response, null, 2));
}

run().catch(console.error);
