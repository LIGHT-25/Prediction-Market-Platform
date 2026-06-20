import { xdr } from "@stellar/stellar-sdk";

const RESULT_XDR = "AAAAAAABIRcAAAAAAAAAAQAAAAAAAAAYAAAAACz3rvAfz7NhmRM8n9m8UflwGSau9PztbxexW8J52D+zAAAAAA==";

function main() {
  const result = xdr.TransactionResult.fromXDR(RESULT_XDR, "base64");
  console.log("Result type:", result.result().switch().name);
  
  const results = result.result().results();
  console.log("Operations results count:", results.length);
  
  const opResult = results[0];
  console.log("OpResult type:", opResult.tr().switch().name);
  
  const invokeHostFnResult = opResult.tr().invokeHostFunctionResult();
  console.log("InvokeHostFnResult type:", invokeHostFnResult.switch().name);
  
  const successVal = invokeHostFnResult.success();
  console.log("Keys of successVal:", Object.keys(successVal));
  console.log("Raw successVal stringified:", JSON.stringify(successVal, null, 2));
  console.log("successVal switch property:", successVal._switch || successVal.switch);
  
  // Let's try converting successVal to XDR or inspecting if it is a Buffer
  try {
    console.log("Is Buffer?", Buffer.isBuffer(successVal));
    console.log("successVal hex:", successVal.toString("hex"));
  } catch (e) {
    console.log("toString failed:", e.message);
  }
}

main();
