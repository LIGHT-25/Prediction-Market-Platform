import { StrKey } from "@stellar/stellar-sdk";

function main() {
  const bytes = [
    221,
    57,
    20,
    11,
    171,
    254,
    196,
    31,
    125,
    126,
    196,
    175,
    35,
    118,
    243,
    201,
    151,
    187,
    138,
    240,
    210,
    149,
    211,
    87,
    120,
    164,
    5,
    145,
    165,
    196,
    94,
    42
  ];
  
  const contractId = StrKey.encodeContract(Buffer.from(bytes));
  console.log("Decoded contract ID:", contractId);
}

main();
