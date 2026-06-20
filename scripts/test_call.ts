import { rpc, xdr, Address, Account, TransactionBuilder, Operation } from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CANCPV7JDFGKA7LAR3VPRRIPAGCODEJXECCG6NGJJ7XOWFZ6AXZB73H3";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

async function main() {
  const rpcServer = new rpc.Server(RPC_URL);
  
  const account = new Account("GDWZRZN5FZ7G6ULFAYCX5Q5WRI4R7KUGFMMGJZB6LWGZXZ52K4NJK2KC", "100");
  const contractAddress = new Address(CONTRACT_ID);
  
  const invokeArgs = xdr.InvokeContractArgs.fromXDR(
    xdr.InvokeContractArgs.toXDR(
      new xdr.InvokeContractArgs({
        contractAddress: contractAddress.toScAddress(),
        functionName: "get_all_markets",
        args: [],
      })
    )
  );

  const op = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeInvokeContract(invokeArgs),
    auth: [],
  });

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(300)
    .build();

  console.log("Simulating get_all_markets call...");
  const sim = await rpcServer.simulateTransaction(tx);
  console.log("Simulation Result:", JSON.stringify(sim, null, 2));
}

main().catch(console.error);
