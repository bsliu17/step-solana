import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button, Col, Row, Table } from "antd";
import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ConnectButton } from "../../components/ConnectButton";
import { useNativeAccount } from "../../contexts/accounts";
import { useConnectionConfig } from "../../contexts/connection";
import { useMarkets } from "../../contexts/market";
import { formatNumber } from "../../utils/utils";

export const ActivityView = () => {
  const { marketEmitter, midPriceInUSD } = useMarkets();
  const { tokenMap } = useConnectionConfig();
  const { account } = useNativeAccount();

  const balance = useMemo(
    () => formatNumber.format((account?.lamports || 0) / LAMPORTS_PER_SOL),
    [account]
  );

  useEffect(() => {
    const refreshTotal = () => {};

    const dispose = marketEmitter.onMarket(() => {
      refreshTotal();
    });

    refreshTotal();

    return () => {
      dispose();
    };
  }, [marketEmitter, midPriceInUSD, tokenMap]);

  const columns = [
    {
      title: 'Input Token',
      dataIndex: 'input',
      key: 'input',
    },
    {
      title: 'Output Token',
      dataIndex: 'output',
      key: 'output',
    },
    {
      title: 'Interval',
      dataIndex: 'interval',
      key: 'interval',
    },
    {
      title: '# Trades',
      dataIndex: 'trades',
      key: 'trades',
    },
    {
      title: 'Remaining Input Balance',
      dataIndex: 'balance',
      key: 'balance',
    },
  ];

  const dataSource = [
    {
      key: '1',
      input: 'SOL',
      output: 'XYZ',
      interval: '1 day',
      trades: 0,
      balance: 10
    },
  ];


  const tradeHistoryCols = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Input Token',
      dataIndex: 'input',
      key: 'input',
    },
    {
      title: 'Output Token',
      dataIndex: 'output',
      key: 'output',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
    }
  ];

  const tradeDataSource = [
    {
      key: '1',
      date: '3/1/2021 12:00 PM',
      input: 'SOL',
      output: 'XYZ',
      amount: '3',
    },
    {
      key: '2',
      date: '2/28/2021 12:00 PM',
      input: 'SOL',
      output: 'XYZ',
      amount: '3.45',
    },
  ];





  return (
    <div style={{width:'100%'}}>
    <Row align="top">
      <h2>Active Streams</h2>
    </Row>
    <Table dataSource={dataSource} columns={columns} style={{width:'100%'}} />
    <Row align="top">
      <h2>Trade History</h2>
    </Row>
    <Table dataSource={tradeDataSource} columns={tradeHistoryCols} style={{width:'100%'}} />
    </div>
  );
};
