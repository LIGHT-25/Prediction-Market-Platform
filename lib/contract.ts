import {
  TransactionBuilder,
  Account,
  Operation,
  rpc,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { RPC_URL, NETWORK_PASSPHRASE, CONTRACT_ID } from "./config";
import { signTx, FreighterError } from "./wallet";

const server = new rpc.Server(RPC_URL);

export async function invokeContract(
  method: string,
  args: xdr.ScVal[],
  callerAddress: string,
  isReadOnly = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ result: any; txHash: string }> {
  if (!callerAddress) {
    throw new FreighterError("Wallet not connected. Please connect your Freighter wallet first.", "NOT_CONNECTED");
  }

  let accountResponse: Response;
  try {
    accountResponse = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${callerAddress}`
    );
  } catch {
    throw new FreighterError("Network error: Unable to reach Stellar Horizon. Check your internet connection.", "NETWORK_ERROR");
  }

  if (!accountResponse.ok) {
    if (accountResponse.status === 404) {
      throw new FreighterError(
        `Account not found on Testnet. Please fund it via Friendbot: https://friendbot.stellar.org/?addr=${callerAddress}`,
        "ACCOUNT_NOT_FOUND"
      );
    }
    throw new FreighterError(`Failed to load account: ${accountResponse.statusText}`, "ACCOUNT_ERROR");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accountData: any;
  try {
    accountData = await accountResponse.json();
  } catch {
    throw new FreighterError("Failed to parse account data", "NETWORK_ERROR");
  }

  const account = new Account(callerAddress, accountData.sequence);

  const tx = buildContractCallTx(account, method, args);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let simResult: any;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch {
    throw new FreighterError("Network error: Unable to simulate transaction. Check your connection.", "NETWORK_ERROR");
  }

  if (rpc.Api.isSimulationError(simResult)) {
    const errMsg = typeof simResult.error === "string"
      ? simResult.error
      : "Contract simulation failed";
    throw new FreighterError(`Contract error: ${errMsg}`, "SIMULATION_ERROR");
  }

  if (isReadOnly) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simSuccess = simResult as rpc.Api.SimulateTransactionSuccessResponse;
    if (simSuccess.result) {
      return {
        result: scValToNative(simSuccess.result.retval),
        txHash: "",
      };
    }
    return { result: null, txHash: "" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let assembledTx: any;
  try {
    assembledTx = rpc.assembleTransaction(tx, simResult);
  } catch {
    throw new FreighterError("Failed to assemble transaction", "ASSEMBLE_ERROR");
  }

  const txToSign = assembledTx.build ? assembledTx.build() : assembledTx;

  let signedXdr: string;
  try {
    signedXdr = await signTx(txToSign.toXDR(), callerAddress);
  } catch (error: unknown) {
    if (error instanceof FreighterError) throw error;
    throw new FreighterError((error as Error)?.message || "Failed to sign transaction", "SIGN_ERROR");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sendResult: any;
  try {
    sendResult = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
    );
  } catch {
    throw new FreighterError("Network error: Failed to submit transaction.", "NETWORK_ERROR");
  }

  if (sendResult.status === "ERROR") {
    const errDetail = sendResult.errorResult?.result?.code || "unknown";
    throw new FreighterError(
      `Transaction failed: ${errDetail}. Check your balance and try again.`,
      "TX_ERROR"
    );
  }

  const txHash = sendResult.hash;
  let getTxResult = await server.getTransaction(txHash);
  const startTime = Date.now();
  const TIMEOUT = 60_000;

  while (getTxResult.status === "NOT_FOUND" && Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, 2000));
    getTxResult = await server.getTransaction(txHash);
  }

  if (getTxResult.status !== "SUCCESS") {
    throw new FreighterError(
      `Transaction did not finalize. Status: ${getTxResult.status}. Hash: ${txHash}`,
      "TX_FINALIZE_ERROR"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let returnValue: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txSuccess = getTxResult as any;
  if (txSuccess.resultMetaXdr) {
    try {
      const meta = xdr.TransactionMeta.fromXDR(
        txSuccess.resultMetaXdr.toXDR("base64"),
        "base64"
      );
      const sorobanMeta = meta.v3()?.sorobanMeta();
      if (sorobanMeta?.returnValue()) {
        returnValue = scValToNative(sorobanMeta.returnValue());
      }
    } catch {
      // Could not parse return value
    }
  }

  return { result: returnValue, txHash };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContractCallTx(
  account: Account,
  method: string,
  args: xdr.ScVal[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!CONTRACT_ID) {
    throw new FreighterError(
      "Contract not deployed. Please deploy the contract first and set NEXT_PUBLIC_CONTRACT_ID in .env",
      "NO_CONTRACT"
    );
  }

  const contractAddress = new Address(CONTRACT_ID);

  const invokeArgs = xdr.InvokeContractArgs.fromXDR(
    xdr.InvokeContractArgs.toXDR(
      new xdr.InvokeContractArgs({
        contractAddress: contractAddress.toScAddress(),
        functionName: method,
        args,
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

  return tx;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readContract(
  method: string,
  args: xdr.ScVal[],
  callerAddress?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const sourceAddress =
    callerAddress || "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

  let accountResponse;
  try {
    accountResponse = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${sourceAddress}`
    ).catch(() => null);
  } catch {
    throw new FreighterError("Network error: Unable to reach Stellar Horizon.", "NETWORK_ERROR");
  }

  let account: Account;
  if (accountResponse && accountResponse.ok) {
    const accountData = await accountResponse.json();
    account = new Account(sourceAddress, accountData.sequence);
  } else {
    account = new Account(sourceAddress, "0");
  }

  const tx = buildContractCallTx(account, method, args);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let simResult: any;
  try {
    simResult = await server.simulateTransaction(tx);
  } catch {
    throw new FreighterError("Network error: Unable to read contract data.", "NETWORK_ERROR");
  }

  if (rpc.Api.isSimulationError(simResult)) {
    throw new FreighterError(`Contract read failed: ${simResult.error}`, "SIMULATION_ERROR");
  }

  const simSuccess = simResult as rpc.Api.SimulateTransactionSuccessResponse;
  if (simSuccess.result) {
    return scValToNative(simSuccess.result.retval);
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchContractEvents(startLedger?: number): Promise<any[]> {
  try {
    const latestLedger = await server.getLatestLedger();
    const start = startLedger || latestLedger.sequence - 1000;

    const eventsResponse = await server.getEvents({
      startLedger: start,
      filters: [
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: "contract" as any,
          contractIds: [CONTRACT_ID],
        },
      ],
      limit: 100,
    });

    return eventsResponse.events || [];
  } catch {
    return [];
  }
}

export { nativeToScVal, scValToNative, Address, xdr };
