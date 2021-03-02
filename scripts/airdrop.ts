import {
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import fs from "mz/fs";

import {getOurAccount} from './lib/account';
import {getNodeConnection} from './lib/connection';
import {airdrop} from './lib/account';

async function main() {
  const ourAccount = await getOurAccount();
  const connection = await getNodeConnection();

  console.log("-----");
  await airdrop(ourAccount, connection);
  let bal = await connection.getBalance(ourAccount.publicKey);
  console.log("Balance of", ourAccount.publicKey.toString(), "is", bal, "(", bal/LAMPORTS_PER_SOL, ")");
  console.log("-----");
}

main().catch(err => {
  console.error(err)
}).then(() => process.exit())
