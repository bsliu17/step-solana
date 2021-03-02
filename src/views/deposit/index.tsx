import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button, Col, Row } from "antd";
import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "../../components/ConnectButton";
import { useNativeAccount } from "../../contexts/accounts";
import { useConnectionConfig } from "../../contexts/connection";
import { useMarkets } from "../../contexts/market";
import { formatNumber } from "../../utils/utils";
import { Deposit } from "../../components/Deposit";

export const DepositView = () => {

  return (
    <Row style={{paddingTop: 20}} align="top">
      <Col span={24}>
        <Deposit />
      </Col>
    </Row>
  );
};
