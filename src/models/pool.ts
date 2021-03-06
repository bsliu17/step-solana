import { AccountInfo, PublicKey } from "@solana/web3.js";
import { TokenAccount } from "./account";

export const DEFAULT_DENOMINATOR = 10_000;

export interface PoolInfo {
  pubkeys: {
    program: PublicKey;
    account: PublicKey;
    holdingAccounts: PublicKey[];
    holdingMints: PublicKey[];
    mint: PublicKey;
    feeAccount?: PublicKey;
  };
  legacy: boolean;
  raw: {
    pubkey: PublicKey,
    data: any,
    account: AccountInfo<Buffer>
  };
}

export interface LiquidityComponent {
  amount: number;
  account?: TokenAccount;
  mintAddress: string;
}

export enum CurveType {
  ConstantProduct = 0,
  ConstantPrice = 1,
  Stable = 2,
  ConstantProductWithOffset = 3,
}

export interface PoolConfig {
  curveType: CurveType;
  fees: {
    tradeFeeNumerator: number;
    tradeFeeDenominator: number;
    ownerTradeFeeNumerator: number;
    ownerTradeFeeDenominator: number;
    ownerWithdrawFeeNumerator: number;
    ownerWithdrawFeeDenominator: number;
    hostFeeNumerator: number;
    hostFeeDenominator: number;
  };

  token_b_offset?: number;
  token_b_price?: number;
}