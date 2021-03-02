import {
  Account,
  Connection
} from "@solana/web3.js"
import fs from "mz/fs";
import {sleep} from "./sleep";

export async function getOurAccount() {
  const keypairFile = "./keypair.json"

  if (!fs.existsSync(keypairFile)) {
    console.log("The expected keypair file",keypairFile,"was not found");
    process.exit(1);
  }

  const secret = JSON.parse((await fs.readFile(keypairFile)).toString());
  const account = new Account(secret);
  console.log('Our account:', account.publicKey.toBase58())

  return account;
}

export async function airdrop(
  account: Account,
  connection: Connection,
  lamports: number = 10000000000,   // current max on devnet is 10 Sol, might change in the future, adjust accordingly
): Promise<Account> {

  const initial = await connection.getBalance(account.publicKey)
  const expected = initial + lamports

  let retries = 10
  await connection.requestAirdrop(account.publicKey, lamports)
  for (;;) {
    await sleep(500)
    if (expected === (await connection.getBalance(account.publicKey))) {
      return account
    }
    if (--retries <= 0) {
      break
    }
    console.log('Airdrop retry ' + retries)
  }
  throw new Error(`Airdrop of ${lamports} failed`)
}
