import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  sendAndConfirmTransaction,
  TransactionInstruction
} from "@solana/web3.js";
import {
  AccountLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  findAssociatedTokenAddress
} from "../src/contexts/spl-token";
import { WRAPPED_SOL_MINT } from "../src/utils/ids";

import {getOurAccount} from './lib/account';
import {getNodeConnection} from './lib/connection';

const fs = require('fs');
import BN from "bn.js";

async function main() {
  console.log("Depositing...");

  const ourAccount = await getOurAccount();
  const connection = await getNodeConnection();

  const stepProgram = new PublicKey('ALMJEd7x4R9igzMte6vBPXphiLTGdM6eirrVQnA2dW4P');
  const depositAmount = 5 * LAMPORTS_PER_SOL;
  const mintPublicKey = WRAPPED_SOL_MINT;//new PublicKey('Ha5VtSz9aH6Qx55fJhfimMFeksB4pLgFQoU6F9CQzSgh');

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Account[] = [];

  const wrappedSOLAccount = new Account();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: ourAccount.publicKey,
      newAccountPubkey: wrappedSOLAccount.publicKey,
      lamports: depositAmount,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  signers.push(wrappedSOLAccount);

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      WRAPPED_SOL_MINT,
      wrappedSOLAccount.publicKey,
      ourAccount.publicKey
    )
  );

  cleanupInstructions.push(
    Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      wrappedSOLAccount.publicKey,
      ourAccount.publicKey,
      ourAccount.publicKey,
      []
    )
  );

  const ourTokenAccount = await findAssociatedTokenAddress(ourAccount.publicKey, mintPublicKey);
  console.log("Our token account:", ourTokenAccount.toString());
  const PDA = await PublicKey.findProgramAddress([Buffer.from("seedy")], stepProgram);
  console.log("PDA: ", PDA.toString());

  instructions.push(new TransactionInstruction({
      programId: stepProgram,
      keys: [
          { pubkey: ourAccount.publicKey, isSigner: true, isWritable: false },
          { pubkey: ourTokenAccount, isSigner: false, isWritable: true },
          { pubkey: PDA[0], isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(Uint8Array.of(1, ...new BN(depositAmount).toArray("le", 8)))
  })

  const tx = new Transaction()
      .add(depositTx);
  await connection.sendTransaction(
      tx,
      [ourAccount],
      {skipPreflight: false, preflightCommitment: 'singleGossip'}
  );


  console.log("-----")
}

main().catch(err => {
  console.error(err)
}).then(() => process.exit())
