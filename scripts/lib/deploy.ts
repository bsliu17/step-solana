import {
  BPF_LOADER_DEPRECATED_PROGRAM_ID,
  BPF_LOADER_PROGRAM_ID,
  SystemProgram,
  Transaction,
  Account,
  BpfLoader,
  Connection,
  PublicKey
} from "@solana/web3.js";
import fs from "mz/fs";

import {sendAndConfirmTransaction} from "./transaction";

export async function estCostLoadProgram(connection:Connection, pathToProgram:string) {
  const {feeCalculator} = await connection.getRecentBlockhash();
  const data = await fs.readFile(pathToProgram);

  const cost =
    feeCalculator.lamportsPerSignature *
      ( (BpfLoader.getMinNumSignatures(data.length)+2) * 2) +
    (await connection.getMinimumBalanceForRentExemption(data.length));

  return cost;
}

export async function loadProgram(connection:Connection, payerAccount:Account, pathToProgram:string) {
  const data = await fs.readFile(pathToProgram);
  const programAccount = new Account();
  console.log("ProgramAccount:",programAccount.publicKey.toString());

  await BpfLoader.load(connection, payerAccount, programAccount, data, BPF_LOADER_PROGRAM_ID);

  return programAccount.publicKey;
}

export async function estCostMakeAccount(connection:Connection, numBytes:number) {
  const {feeCalculator} = await connection.getRecentBlockhash();
  return await connection.getMinimumBalanceForRentExemption(numBytes) + 2 * feeCalculator.lamportsPerSignature;
}

export async function makeAccount(connection:Connection, payerAccount:Account, numBytes:number, programId:PublicKey) {
  const dataAccount = new Account();
  const rentExemption = await connection.getMinimumBalanceForRentExemption(numBytes);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: dataAccount.publicKey,
      lamports: rentExemption,
      space: numBytes,
      programId: programId,
    })
  );

  await sendAndConfirmTransaction(
    'createAccount',
    connection,
    transaction,
    payerAccount,
    dataAccount,
  );

  return dataAccount.publicKey;
}
