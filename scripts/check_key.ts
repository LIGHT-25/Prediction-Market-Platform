import { xdr } from "@stellar/stellar-sdk";

function main() {
  console.log("Keys of xdr.ScVal starting with scv:", Object.keys(xdr.ScVal).filter(k => k.startsWith("scv")));
  try {
    const key = xdr.ScVal.scvLedgerKeyContractInstance();
    console.log("scvLedgerKeyContractInstance value type:", typeof key);
    console.log("scvLedgerKeyContractInstance representation:", JSON.stringify(key, null, 2));
  } catch (err) {
    console.error("scvLedgerKeyContractInstance failed:", err.message);
  }
}

main();
