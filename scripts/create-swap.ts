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
      TokenSwap
  } from "@solana/spl-token-swap";

  import {getNodeConnection} from './lib/connection';

  async function newAccountWithLamports(
    connection: Connection,
    lamports: number = 1000000,
  ): Promise<Account> {
    const account = new Account();

    let retries = 30;
    await connection.requestAirdrop(account.publicKey, lamports);
    for (;;) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      if (lamports == (await connection.getBalance(account.publicKey))) {
        return account;
      }
      if (--retries <= 0) {
        break;
      }
    }
    throw new Error(`Airdrop of ${lamports} failed`);
  }

  async function main() {
    console.log("Creating Token Swap...");

    const connection = await getNodeConnection();

    const payer = await newAccountWithLamports(connection, 1000000000);
    console.log("Payer: ", payer.publicKey.toString())
    const TOKEN_SWAP_PROGRAM_ID = new PublicKey("SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8");
    const SWAP_PROGRAM_OWNER_FEE_ADDRESS = new PublicKey('HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN'); // ???

    // Token swap
    let tokenSwap: TokenSwap;
    // authority of the token and accounts
    let authority: PublicKey;
    // nonce used to generate the authority public key
    let nonce: number;
    // owner of the user accounts
    let owner: Account;
    // Token pool
    let tokenPool: Token;
    let tokenAccountPool: PublicKey;
    let feeAccount: PublicKey;
    // Tokens swapped
    let mintA: Token;
    let mintB: Token;
    let tokenAccountA: PublicKey;
    let tokenAccountB: PublicKey;

    // curve type used to calculate swaps and deposits
    const CurveType = Object.freeze({
        ConstantProduct: 0, // Constant product curve, Uniswap-style
        ConstantPrice: 1, // Constant price curve, always X amount of A token for 1 B token, where X is defined at init
        Offset: 3, // Offset curve, like Uniswap, but with an additional offset on the token B side
    });
    const CURVE_TYPE = CurveType.ConstantProduct;

    // Pool fees
    const TRADING_FEE_NUMERATOR = 25;
    const TRADING_FEE_DENOMINATOR = 10000;
    const OWNER_TRADING_FEE_NUMERATOR = 5;
    const OWNER_TRADING_FEE_DENOMINATOR = 10000;
    const OWNER_WITHDRAW_FEE_NUMERATOR = 0;
    const OWNER_WITHDRAW_FEE_DENOMINATOR = 0;
    const HOST_FEE_NUMERATOR = 20;
    const HOST_FEE_DENOMINATOR = 100;

    // Swap instruction constants
    // Because there is no withdraw fee in the production version, these numbers
    // need to get slightly tweaked in the two cases.
    const SWAP_AMOUNT_IN = 100000;
    const SWAP_AMOUNT_OUT = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 90661 : 90674;
    const SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 22273 : 22276;
    const HOST_SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS
        ? Math.floor((SWAP_FEE * HOST_FEE_NUMERATOR) / HOST_FEE_DENOMINATOR)
        : 0;
    const OWNER_SWAP_FEE = SWAP_FEE - HOST_SWAP_FEE;

    // Initial amount in each swap token
    let currentSwapTokenA = 1000000;
    let currentSwapTokenB = 1000000;

    owner = await newAccountWithLamports(connection, 1000000000);
    const tokenSwapAccount = new Account();

    [authority, nonce] = await PublicKey.findProgramAddress(
        [tokenSwapAccount.publicKey.toBuffer()],
        TOKEN_SWAP_PROGRAM_ID,
    );

    console.log('creating pool mint');
    tokenPool = await Token.createMint(
        connection,
        payer,
        authority,
        null,
        2,
        TOKEN_PROGRAM_ID,
    );

    console.log('creating pool account');
    tokenAccountPool = await tokenPool.createAccount(owner.publicKey);
    const ownerKey = owner.publicKey;
    feeAccount = await tokenPool.createAccount(ownerKey);

    console.log('creating token A');
    mintA = await Token.createMint(
        connection,
        payer,
        owner.publicKey,
        null,
        2,
        TOKEN_PROGRAM_ID,
    );

    console.log('creating token A account');
    tokenAccountA = await mintA.createAccount(authority);
    console.log('minting token A to swap');
    await mintA.mintTo(tokenAccountA, owner, [], currentSwapTokenA);

    console.log('creating token B');
    mintB = await Token.createMint(
        connection,
        payer,
        owner.publicKey,
        null,
        2,
        TOKEN_PROGRAM_ID,
    );

    console.log('creating token B account');
    tokenAccountB = await mintB.createAccount(authority);
    console.log('minting token B to swap');
    await mintB.mintTo(tokenAccountB, owner, [], currentSwapTokenB);

    console.log('creating token swap');
    const swapPayer = await newAccountWithLamports(connection, 10000000000);
    console.log("Swap Payer: ", swapPayer.publicKey.toString())
    tokenSwap = await TokenSwap.createTokenSwap(
        connection,
        swapPayer,
        tokenSwapAccount,
        authority,
        tokenAccountA,
        tokenAccountB,
        tokenPool.publicKey,
        mintA.publicKey,
        mintB.publicKey,
        feeAccount,
        tokenAccountPool,
        TOKEN_SWAP_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        nonce,
        TRADING_FEE_NUMERATOR,
        TRADING_FEE_DENOMINATOR,
        OWNER_TRADING_FEE_NUMERATOR,
        OWNER_TRADING_FEE_DENOMINATOR,
        OWNER_WITHDRAW_FEE_NUMERATOR,
        OWNER_WITHDRAW_FEE_DENOMINATOR,
        HOST_FEE_NUMERATOR,
        HOST_FEE_DENOMINATOR,
        CURVE_TYPE,
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('loading token swap');
    const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
        connection,
        tokenSwapAccount.publicKey,
        TOKEN_SWAP_PROGRAM_ID,
        payer,
    );

    console.log(fetchedTokenSwap)
  }

  main().catch(err => {
    console.error(err)
  }).then(() => process.exit())
