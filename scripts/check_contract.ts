import { rpc, xdr, Address } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CDOTOFALVP7MIH35P3CK6I3W6PEZPO4K6DJJLU2XPCSALENFYRPCUVAD";

async function run() {
  const rpcServer = new rpc.Server(RPC_URL);
  
  const contractAddress = new Address(CONTRACT_ID);
  
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: contractAddress.toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );

  console.log("Querying ledger entry for contract instance...");
  const response = await rpcServer.getLedgerEntries(ledgerKey);
  console.log("Response:", JSON.stringify(response, null, 2));
}

run().catch(console.error);
