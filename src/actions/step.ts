import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
} from "../contexts/spl-token";
import { createUninitializedAccount } from "../actions/account";
import { sendTransaction } from "../contexts/connection";
import { WRAPPED_SOL_MINT } from "../utils/ids";

import BN from "bn.js";
import { DexInstructions } from "@project-serum/serum";

export const STEP_PROGRAM_ID: PublicKey = new PublicKey(
  'J8Nug8arcy4c85Cur7sU8Q551r9N8xLZhbU7e8XDGT9L',
);

export const STEP_TOKEN_PDA_SEED = [Buffer.from("seedy")];
export const STEP_POOL_PDA_SEED = [Buffer.from("sol-pool-123456789abcdefghijklmn")];

export const depositTokens = async(
  connection: Connection,
  wallet: any,
  depositAmount: number,
  tokenMintAddress: PublicKey
) => {

  if (!wallet?.publicKey) {
    throw new Error("Wallet is not connected");
  }

  if (!tokenMintAddress) {
    throw new Error("Invalid mint selected");
  }

  const depositorAccount:PublicKey = wallet.publicKey;

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Account[] = [];
  const isWrappedSOL = tokenMintAddress.equals(WRAPPED_SOL_MINT);
  let wrappedSOLAccount: PublicKey;

  if (isWrappedSOL) {
    const rentAmount =  await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

    wrappedSOLAccount = createUninitializedAccount(
      instructions,
      depositorAccount,
      rentAmount + (depositAmount * LAMPORTS_PER_SOL),
      signers
    );

    console.log("New wrapped SOL acc: ", wrappedSOLAccount.toString(), "with amt: ", depositAmount * LAMPORTS_PER_SOL)

    instructions.push(
      Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        WRAPPED_SOL_MINT,
        wrappedSOLAccount,
        depositorAccount
      )
    );

    cleanupInstructions.push(
      Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        wrappedSOLAccount,
        depositorAccount,
        depositorAccount,
        []
      )
    );
  }

  console.log("Token mint:", tokenMintAddress.toString())
  console.log("Wallet Account:", depositorAccount.toString());
  let depositorTokenAccount: PublicKey;
  if (isWrappedSOL) {
    depositorTokenAccount = wrappedSOLAccount!;
  } else {
    depositorTokenAccount = await findAssociatedTokenAddress(depositorAccount, tokenMintAddress);
  }

  console.log("Depositor token account:", depositorTokenAccount.toString());
  const PDA_TOKEN_ACCOUNT = await PublicKey.findProgramAddress(STEP_TOKEN_PDA_SEED, STEP_PROGRAM_ID);
  console.log("PDA: ", PDA_TOKEN_ACCOUNT.toString());
  console.log("Deposit amount: ", depositAmount)
  const PDA_POOL_STATE = await PublicKey.findProgramAddress(STEP_POOL_PDA_SEED, STEP_PROGRAM_ID);

  instructions.push(new TransactionInstruction({
    programId: STEP_PROGRAM_ID,
    keys: [
        { pubkey: depositorAccount, isSigner: true, isWritable: false },
        { pubkey: depositorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: PDA_POOL_STATE[0], isSigner: false, isWritable: true },
        { pubkey: PDA_TOKEN_ACCOUNT[0], isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(Uint8Array.of(2, ...new BN(depositAmount * LAMPORTS_PER_SOL).toArray("le", 8)))
  }));

  await sendTransaction(
    connection,
    wallet,
    instructions.concat(cleanupInstructions),
    signers,
    true
  );
}
