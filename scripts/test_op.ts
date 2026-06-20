import {
  TransactionBuilder,
  Account,
  Operation,
  xdr,
  Address,
} from "@stellar/stellar-sdk";

function test() {
  const account = new Account("GDWZRZN5FZ7G6ULFAYCX5Q5WRI4R7KUGFMMGJZB6LWGZXZ52K4NJK2KC", "100");
  const contractAddress = new Address("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
  
  const invokeArgs = xdr.InvokeContractArgs.fromXDR(
    xdr.InvokeContractArgs.toXDR(
      new xdr.InvokeContractArgs({
        contractAddress: contractAddress.toScAddress(),
        functionName: "create_market",
        args: [],
      })
    )
  );

  try {
    console.log("Constructing using Operation.invokeHostFunction...");
    const op = Operation.invokeHostFunction({
      func: xdr.HostFunction.hostFunctionTypeInvokeContract(invokeArgs),
      auth: [],
    });
    
    console.log("Building transaction...");
    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(op)
      .setTimeout(300)
      .build();
      
    console.log("Successfully built transaction!");
    console.log("Operations count:", tx.operations.length);
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
