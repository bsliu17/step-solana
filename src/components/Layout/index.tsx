import React from "react";
import "./../../App.less";
import { Button, Layout } from "antd";
import { Link } from "react-router-dom";

import { LABELS } from "../../constants";
import { AppBar } from "../AppBar";
import logo from "../../assets/step.png";

const { Header, Content } = Layout;

export const AppLayout = React.memo((props: any) => {
  return (
    <div className="App wormhole-bg">
      <Layout title={LABELS.APP_TITLE}>
        <Header className="App-Bar">
          <Link to="/">

            <div className="app-title">
              <h2><img src={logo} style={{marginRight: 10}} width={32} height={32}/ >Step Finance</h2>
            </div>
          </Link>
          <div>
          <Link style={{paddingRight: 5}} to="/">
            <Button>Dashboard</Button>
          </Link>
          <Link style={{paddingRight: 5}} to="/deposit">
            <Button>Deposit</Button>
          </Link>
          <Link style={{paddingRight: 5}} to="/streams">
            <Button>Streams</Button>
          </Link>
          <Link style={{paddingRight: 5}} to="/activity">
            <Button>Activity</Button>
          </Link>
          <Link to="/admin">
            <Button>Admin</Button>
          </Link>
          </div>
          <AppBar />
        </Header>
        <Content style={{ padding: "0 50px" }}>{props.children}</Content>
      </Layout>
    </div>
  );
});
