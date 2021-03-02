import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import {
  AccountLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { WRAPPED_SOL_MINT } from "../src/utils/ids";

import BN from "bn.js";
import * as BufferLayout from "buffer-layout";

import {getOurAccount} from './lib/account';
import {getNodeConnection} from './lib/connection';
//import {getStore, setStore} from './storeConfig'

import {estCostLoadProgram, loadProgram,
        estCostMakeAccount, makeAccount } from './lib/deploy';

const fs = require('fs');

const pathToProgram = './dist/program/step_finance.so';

async function main() {
  console.log("Deploying...")

  try {
    if (fs.existsSync(pathToProgram)) {
    }
  } catch(err) {
    console.error("No file "+pathToProgram+" -- build rust program first")
    process.exit(1)
  }

  const ourAccount = await getOurAccount()
  const connection = await getNodeConnection()

  console.log("-----")

  const estimatedCostOfLoad = await estCostLoadProgram(connection, pathToProgram);

  console.log("Estimated cost to program load:", estimatedCostOfLoad, " lamports (", estimatedCostOfLoad/LAMPORTS_PER_SOL, ") Sol")

  const startingBalance = await connection.getBalance(ourAccount.publicKey)
  const programId = await loadProgram(connection, ourAccount, pathToProgram)
  const afterLoadBalance = await connection.getBalance(ourAccount.publicKey)
  const costLoad = startingBalance - afterLoadBalance

  console.log("Program loaded to:",programId.toBase58()," cost was:", costLoad, " lamports (", costLoad/LAMPORTS_PER_SOL, ") Sol")


  const PROGRAM_STATE_PDA = await PublicKey.findProgramAddress([Buffer.from("step_program_state-123456789abcb")], programId);
  // Init Program
  const initTx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: ourAccount.publicKey, isSigner: true, isWritable: false },
        { pubkey: PROGRAM_STATE_PDA[0], isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      data: Buffer.from(Uint8Array.of(0))
  })

  let tx = new Transaction()
    .add(initTx);
  await connection.sendTransaction(
    tx,
    [ourAccount],
    {skipPreflight: false, preflightCommitment: 'singleGossip'}
  );

  // NEED THIS OTHERWISE PROGRAM STATE ACCOUNT IS NOT ON CHAIN YET
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const publicKey = (property = "publicKey") => {
    return BufferLayout.blob(32, property);
  };

  const uint64 = (property: string = 'uint64'): Object => {
    return BufferLayout.blob(8, property);
  };

  const PROGRAM_STATE_DATA_LAYOUT = BufferLayout.struct([
    BufferLayout.u8("isInitialized"),
    publicKey("deployerPubkey")
  ]);

  interface ProgramStateLayout {
    isInitialized: number,
    deployerPubkey: Uint8Array,
  }

  const encodedEscrowState = (await connection.getAccountInfo(PROGRAM_STATE_PDA[0], 'singleGossip'))!.data;
  const decodedEscrowState = PROGRAM_STATE_DATA_LAYOUT.decode(encodedEscrowState) as ProgramStateLayout;
  console.log( {
      escrowAccountPubkey: new PublicKey(decodedEscrowState.deployerPubkey).toBase58(),
      isInitialized: !!decodedEscrowState.isInitialized,
  });

  // Init Pool
  const mintPublicKey = WRAPPED_SOL_MINT;//new PublicKey('Ha5VtSz9aH6Qx55fJhfimMFeksB4pLgFQoU6F9CQzSgh');
  const TOKEN_ACCOUNT_PDA = await PublicKey.findProgramAddress([Buffer.from("seedy")], programId);
  const POOL_INFO_SEED = Buffer.from("sol-pool-123456789abcdefghijklmn");
  const POOL_INFO_PDA = await PublicKey.findProgramAddress([POOL_INFO_SEED], programId);

  const initPoolTx = new TransactionInstruction({
      programId: programId,
      keys: [
          { pubkey: ourAccount.publicKey, isSigner: true, isWritable: false },
          { pubkey: PROGRAM_STATE_PDA[0], isSigner: false, isWritable: false },
          { pubkey: POOL_INFO_PDA[0], isSigner: false, isWritable: true },
          { pubkey: TOKEN_ACCOUNT_PDA[0], isSigner: false, isWritable: true },
          { pubkey: mintPublicKey, isSigner: false, isWritable: false},
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      data: Buffer.from(Uint8Array.of(1, ...POOL_INFO_SEED))
  })

  tx = new Transaction()
    .add(initPoolTx);
  await connection.sendTransaction(
      tx,
      [ourAccount],
      {skipPreflight: false, preflightCommitment: 'singleGossip'}
  );

  // NEED THIS OTHERWISE PROGRAM STATE ACCOUNT IS NOT ON CHAIN YET
  await new Promise((resolve) => setTimeout(resolve, 2000));

  interface UserAccountLayout {
    balance: number
  }

  interface PoolLayout {
    isInitialized: number,
    mintPubkey: Uint8Array,
    pdaSeed: Uint8Array,
    userAccount: UserAccountLayout,
  }

  const USER_ACCOUNT_DATA_LAYOUT = BufferLayout.struct([
    BufferLayout.u32("accountIndex"),
    uint64("balance"),
  ], 'userAccount');

  const POOL_DATA_LAYOUT = BufferLayout.struct([
    BufferLayout.u8("isInitialized"),
    publicKey("mintPubkey"),
    BufferLayout.blob(32, "pdaSeed"),
    USER_ACCOUNT_DATA_LAYOUT,
  ]);



  const encodedPoolState = (await connection.getAccountInfo(POOL_INFO_PDA[0], 'singleGossip'))!.data;
  const decodedPoolState = POOL_DATA_LAYOUT.decode(encodedPoolState) as PoolLayout;
  console.log( {
    mintPubkey: new PublicKey(decodedPoolState.mintPubkey).toBase58(),
    isInitialized: !!decodedPoolState.isInitialized,
    pdaSeed: decodedPoolState.pdaSeed.toString(),
    account: {
      balance: decodedPoolState.userAccount.balance
    },
  });

  console.log("-----")
}

main().catch(err => {
  console.error(err)
}).then(() => process.exit())
