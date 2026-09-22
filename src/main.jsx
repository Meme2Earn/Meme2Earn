import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider, getAccessToken, useLogin, usePrivy, useWallets } from "@privy-io/react-auth";
import App from "./App.jsx";
import "./styles.css";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
const hasPrivyAppId = Boolean(privyAppId && privyAppId !== "your_privy_app_id_here");
const robinhoodMainnet = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
};

function PrivyConnectedApp() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const auth = useMemo(
    () => ({ ready, authenticated, getAccessToken, login, logout, user, wallets }),
    [authenticated, login, logout, ready, user, wallets],
  );

  return <App auth={auth} />;
}

function MissingPrivyConfigApp() {
  const auth = useMemo(
    () => ({
      ready: true,
      authenticated: false,
      wallets: [],
      user: null,
      getAccessToken: async () => "",
      login: () => {
        window.alert("Add your Privy app ID to VITE_PRIVY_APP_ID in .env, then restart the dev server.");
      },
      logout: () => {},
    }),
    [],
  );

  return <App auth={auth} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {hasPrivyAppId ? (
      <PrivyProvider
        appId={privyAppId}
        config={{
          defaultChain: robinhoodMainnet,
          supportedChains: [robinhoodMainnet],
          loginMethods: ["twitter"],
          embeddedWallets: {
            ethereum: {
              createOnLogin: "all-users",
            },
          },
          appearance: {
            theme: "light",
            accentColor: "#FF3EA0",
            logo: "/favicon.svg",
          },
        }}
      >
        <PrivyConnectedApp />
      </PrivyProvider>
    ) : (
      <MissingPrivyConfigApp />
    )}
  </React.StrictMode>,
);
