import { Button, Card, Popover, Spin, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import {
  PublicKey,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  useConnection,
  useConnectionConfig,
  useSlippageConfig,
} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { CurrencyInput } from "../CurrencyInput";
import { CurrencySelect } from "../CurrencySelect";
//import { NumericInput } from "../numericInput";
import * as BufferLayout from "buffer-layout";

import {
  LoadingOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { notify } from "../../utils/notifications";
import "./trade.less";
import { getTokenName } from "../../utils/utils";
var NumericInput = require('react-numeric-input');

const { Text } = Typography;

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export const TradeEntry = () => {
  const { connect, connected } = useWallet();
  const connection = useConnection();
  const [pendingTx, setPendingTx] = useState(false);
  const { slippage } = useSlippageConfig();
  const { tokenMap } = useConnectionConfig();

  const [buyAmount, setBuyAmount] = useState(0);
  const [interval, setInterval] = useState(0);
  const [inputToken, setInputToken] = useState(new PublicKey(0));
  const [outputToken, setOutputToken] = useState(new PublicKey(0));

  /*const publicKey = (property = "publicKey") => {
    return BufferLayout.blob(32, property);
  };

  const uint64 = (property: string = 'uint64'): Object => {
    return BufferLayout.blob(8, property);
  };

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
  });*/

  const handleAddStream = async () => {

  };

  return (
    <>
     <Card
        className="exchange-card"
        headStyle={{ padding: 0 }}
        bodyStyle={{ position: "relative" }}
      >
        <div className="input-card">
          Asset to Spend
          <CurrencySelect
            onMintChange={(item) => {
              setInputToken(new PublicKey(item));
            }}
          />

          Asset to Purchase
          <CurrencyInput
            title="Input"
            onInputChange={(val: any) => {
              console.log(val)
              setBuyAmount(val);
            }}
            onMintChange={(item) => {
              setOutputToken(new PublicKey(item));
            }}
          />

          Interval (days)
          <Card
            className="ccy-input"
            style={{ borderRadius: 20, width: "100%" }}
            bodyStyle={{ padding: 0 }}
          >
            <NumericInput
              onChange={(val: any) => {
                console.log("seeting inteh", val)
                setInterval(val);
              }}
              min={1}
              max={30}
              inputmode="numeric"
              style={{
                wrap: {
                  background: 'transparent',
                  boxShadow: 'none',
                  padding: '12px 12.26ex 12px 12px',
                  borderColor: "transparent",
                  outline: "transparent",
                  fontSize: 20,
                  textaAlign: "center",
                },
                input: {
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.85)',
                  padding: '0.1ex 1ex',
                  border: 'none',
                  boxShadow: "none",
                  borderColor: "transparent",
                  outline: "transparent",
                  textAlign: "center",
                  width: "370px"
                },
                btn: {
                  display: 'none'
                }
              }}
            />
          </Card>
          {(connected &&
            (!inputToken.equals(new PublicKey(0)) &&
            !outputToken.equals(new PublicKey(0)) &&
            interval > 0 && buyAmount > 0)) && <span style={{padding: 10}}>Step will purchase {buyAmount} SOL worth of XYZ every {interval} days</span>}

        <Button
          className="trade-button"
          type="primary"
          size="large"
          onClick={connected ? handleAddStream : connect!}
          style={{ width: "100%" }}
          disabled={
            (connected && pendingTx) || (connected &&
            (inputToken.equals(new PublicKey(0)) ||
            outputToken.equals(new PublicKey(0)) ||
            interval == 0 || buyAmount == 0))
          }
        >
          {connected ? "Create Stream" : "Connect Wallet"}
          {pendingTx && <Spin indicator={antIcon} className="add-spinner" />}
        </Button>
        </div>
      </Card>
    </>
  );
};
