import { rpc } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const TX_HASH = "450295d7f8fb6d6374d690a1888a932b97ef112b31c3b6c8fc419a34c2377091";

async function run() {
  const rpcServer = new rpc.Server(RPC_URL);
  console.log(`Fetching transaction details for: ${TX_HASH}`);
  const getTx = await rpcServer.getTransaction(TX_HASH);
  console.log("Status:", getTx.status);
  console.log("Result XDR:", getTx.resultXdr?.toXDR?.("base64") || getTx.resultXdr);
  console.log("Meta XDR:", getTx.resultMetaXdr?.toXDR?.("base64") || getTx.resultMetaXdr);
}

run().catch(console.error);
