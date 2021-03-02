import { Button, Card, Popover, Spin, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import {
  PublicKey,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  depositTokens
} from "../../actions/step";
import {
  useConnection,
  useConnectionConfig
} from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { CurrencyInput } from "../CurrencyInput";
import { CurrencySelect } from "../CurrencySelect";
import {
  LoadingOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { notify } from "../../utils/notifications";
import "./deposit.less";
import { getTokenName } from "../../utils/utils";

const { Text } = Typography;

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export const Deposit = () => {
  const { wallet, connect, connected } = useWallet();
  const connection = useConnection();
  const [pendingTx, setPendingTx] = useState(false);
  const { tokenMap } = useConnectionConfig();
  const [depositAmount, setDepositAmount] = useState(0);
  const [selectedMint, setSelectedMint] = useState(new PublicKey(0));

  const handleDeposit = async () => {
    if (depositAmount == 0 || !selectedMint) {
      notify({
        message: "Invalid inputs",
        type: "error",
      });
      return;
    }

    try {
      setPendingTx(true);
      await depositTokens(
        connection,
        wallet!,
        depositAmount,
        selectedMint
      );

      notify({
        message: "Deposit successful",
        type: "success",
      });
      setPendingTx(false);
    } catch (err) {
      setPendingTx(false);
    }
  };

  return (
    <>
      <Card
        className="exchange-card"
        headStyle={{ padding: 0 }}
        bodyStyle={{ position: "relative" }}
      >
        <div className="input-card">
          Select Asset to Deposit
          <CurrencyInput
            title="Input"
            onInputChange={(val: any) => {
              setDepositAmount(val);
            }}
            onMintChange={(item) => {
              setSelectedMint(new PublicKey(item));
            }}
          />

          <Button
            className="trade-button"
            type="primary"
            size="large"
            onClick={connected ? handleDeposit : connect!}
            style={{ width: "100%" }}
            disabled={
              (connected && pendingTx) || (connected &&
              (depositAmount == 0 ||
              selectedMint.equals(new PublicKey(0))))
            }
          >
            {connected ? "Deposit" : "Connect Wallet"}
            {pendingTx && <Spin style={{margin: "0 0 0 -20px", color: "#fff"}} indicator={antIcon} className="add-spinner" />}
          </Button>
        </div>
      </Card>

    </>
  );
};
