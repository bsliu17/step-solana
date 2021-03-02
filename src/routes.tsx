import { HashRouter, Route, Switch } from "react-router-dom";
import React from "react";
import { WalletProvider } from "./contexts/wallet";
import { ConnectionProvider } from "./contexts/connection";
import { AccountsProvider } from "./contexts/accounts";
import { MarketProvider } from "./contexts/market";
import { AppLayout } from "./components/Layout";

import { FaucetView, HomeView, DepositView, ExchangeView, ActivityView, AdminView } from "./views";

export function Routes() {
  return (
    <>
      <HashRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <MarketProvider>
                <AppLayout>
                  <Switch>
                    <Route exact path="/" component={() => <HomeView />} />
                    <Route exact path="/faucet" children={<FaucetView />} />
                    <Route exact path="/deposit" children={<DepositView />} />
                    <Route exact path="/streams" children={<ExchangeView />} />
                    <Route exact path="/activity" children={<ActivityView />} />
                    <Route exact path="/admin" children={<AdminView />} />
                  </Switch>
                </AppLayout>
              </MarketProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </HashRouter>
    </>
  );
}
