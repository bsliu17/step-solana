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

import {
  swapInstruction,
  TokenSwapLayout,
  TokenSwapLayoutLegacyV0 as TokenSwapLayoutV0,
  TokenSwapLayoutV1,
} from "../src/models";

import {getOurAccount} from './lib/account';
import {getNodeConnection} from './lib/connection';
//import {getStore, setStore} from './storeConfig'

import {estCostLoadProgram, loadProgram,
        estCostMakeAccount, makeAccount } from './lib/deploy';

async function main() {
  console.log("Cranking...")

  const ourAccount = await getOurAccount()
  const connection = await getNodeConnection()

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Account[] = [];


  // Crank out a trade
  const STEP_PROGRAM_ID = new PublicKey("J8Nug8arcy4c85Cur7sU8Q551r9N8xLZhbU7e8XDGT9L");
  const TOKEN_SWAP_PROGRAM_ID = new PublicKey("SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8");
  const SWAP_PROGRAM_OWNER_FEE_ADDRESS = new PublicKey('C34mM1bzS3gCX4u44Qq25pyaQ5zdjsFmfJFY125TFf6w');
  const SWAP_INFO = new PublicKey("3yhvcTMcTdyQc1AmpgH4p26srr4BvxwSdnxJ9zwmEDop");
  const swapAmount = 1 * LAMPORTS_PER_SOL;

  const TOKEN_ACCOUNT_PDA = await PublicKey.findProgramAddress([Buffer.from("seedy")], STEP_PROGRAM_ID);
  const POOL_INFO_SEED = Buffer.from("sol-pool-123456789abcdefghijklmn");
  const POOL_INFO_PDA = await PublicKey.findProgramAddress([POOL_INFO_SEED], STEP_PROGRAM_ID);

  const encodedPoolState = (await connection.getAccountInfo(SWAP_INFO, 'singleGossip'))!.data;
  const layout =
            encodedPoolState.length === TokenSwapLayout.span
              ? TokenSwapLayout
              : encodedPoolState.length === TokenSwapLayoutV1.span
                ? TokenSwapLayoutV1
                : TokenSwapLayoutV0;
  const poolInfo = layout.decode(encodedPoolState);
  console.log(new PublicKey(poolInfo.tokenPool).toBase58())

  const poolToken = new PublicKey(poolInfo.tokenPool);
  const mintAuthority = new PublicKey('75oSKgHQT5fVj9B3wPxmJpmeCWCFU4FiJMB38HRKpbdg')
  const tokenAccountA = new PublicKey(poolInfo.tokenAccountA)
  const tokenAccountB = new PublicKey(poolInfo.tokenAccountB)

  console.log("Creating destination token account..")
  const destinationAccount = new Account();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: ourAccount.publicKey,
      newAccountPubkey: destinationAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span,
      ),
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      new PublicKey('8CsX5hpLvojumpQ5REG14Ny5ibMLS3euKBun19uGQF85'),
      destinationAccount.publicKey,
      ourAccount.publicKey
    )
  );

  let destAccountTx = new Transaction();
  instructions.forEach((instruction) => destAccountTx.add(instruction));
  await connection.sendTransaction(
    destAccountTx,
    [ourAccount, destinationAccount],
    {skipPreflight: false, preflightCommitment: 'singleGossip'}
  );

  console.log("Destination account:", destinationAccount.publicKey.toString())

  console.log("Sending crank..")
  const tradeTx = new TransactionInstruction({
      programId: STEP_PROGRAM_ID,
      keys: [
        { pubkey: ourAccount.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_ACCOUNT_PDA[0], isSigner: false, isWritable: true },
        { pubkey: TOKEN_SWAP_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: STEP_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SWAP_INFO, isSigner: false, isWritable: false },
        { pubkey: mintAuthority, isSigner: false, isWritable: false },
        { pubkey: tokenAccountA, isSigner: false, isWritable: true },
        { pubkey: tokenAccountB, isSigner: false, isWritable: true },
        { pubkey: destinationAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: poolToken, isSigner: false, isWritable: true },
        { pubkey: SWAP_PROGRAM_OWNER_FEE_ADDRESS, isSigner: false, isWritable: true },
      ],
      data: Buffer.from(Uint8Array.of(4, ...POOL_INFO_SEED))
  })

  let tx = new Transaction()
    .add(tradeTx);
  await connection.sendTransaction(
    tx,
    [ourAccount],
    {skipPreflight: false, preflightCommitment: 'singleGossip'}
  );

}

main().catch(err => {
  console.error(err)
}).then(() => process.exit())
