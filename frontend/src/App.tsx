import "./App.css";
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import { Menu } from "./Menu";
import "bootstrap/dist/css/bootstrap.min.css";
import ContractBox from "./common/ContractBox";
import { Navbar, Container, Button } from "react-bootstrap";
import { SpaceCoin__factory, SpaceCoinIco__factory, SpaceCoinEthPair__factory, SpaceCoinRouter__factory } from "./types";

export class EnumView {
  static spaceCoin = "Space Coin";
  static spaceCoinIco = "Space Coin Ico";
  static spaceCoinEthPair = "Space Coin Eth Pair";
  static spaceCoinRouter = "Space Coin Router";
  static getKey = value => Object.entries(EnumView).find(([key, val]) => value === val)?.[0];
}

const EnumContracts = {
  spaceCoin: {
    factory: SpaceCoin__factory,
    envKey: "REACT_APP_SPACE_COIN_ADDRESS",
  },
  spaceCoinIco: {
    factory: SpaceCoinIco__factory,
    envKey: "REACT_APP_SPACE_COIN_ICO_ADDRESS",
  },
  spaceCoinEthPair: {
    factory: SpaceCoinEthPair__factory,
    envKey: "REACT_APP_SPACE_COIN_ETH_PAIR_ADDRESS",
  },
  spaceCoinRouter: {
    factory: SpaceCoinRouter__factory,
    envKey: "REACT_APP_SPACE_COIN_ROUTER_ADDRESS",
  },
};

export const ViewContext = React.createContext(EnumView.spaceCoin);

export default function App() {
  // store greeting in local state
  const [web3Provider, setWeb3Provider] = useState<Web3Provider | null>(null);
  const [view, setView] = useState(EnumView.spaceCoin);
  // request access to the user's MetaMask account
  async function connectToMetaMask() {
    console.log("🚀 ~ file: App.tsx ~ line 47 ~ connectToMetaMask ~ connectToMetaMask")
    await (window as any).ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider((window as any).ethereum);
    provider.on('chainChanged', () => {
      console.log("chainChanged")
      window.location.reload()
    })
    provider.on('accountChanged', () => {
      console.log("accountChanged")
      window.location.reload()
    })
    setWeb3Provider(provider);
  }

  const connectToDeployedContract = (view) => {
    try{
      const provider = web3Provider
      const signer = provider.getSigner()
      const { factory, envKey } = EnumContracts[EnumView.getKey(view)]
      const deployedContract = factory.connect(process.env[envKey], signer)
      return deployedContract
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    console.log("useeffect started");
    connectToMetaMask();
  }, []);

  // useEffect(() => {
  //   console.log('registering change handlers')
  //   if((window as any).ethereum) {
  //     (window as any).ethereum.on('chainChanged', () => {
  //       window.location.reload();
  //     })
  //     (window as any).ethereum.on('accountsChanged', () => {
  //       window.location.reload();
  //     })
  //     console.log('registereds change handlers')
  //   }
  // })

  return (
    <div className="App">
      <ViewContext.Provider value={view}>
        <ViewContext.Consumer>
          {value => {
            return (
              <Container>
                <Menu
                  web3Provider={web3Provider}
                  view={value}
                  setView={setView}
                  connectToMetaMask={connectToMetaMask}
                />
                <Container>
                  {web3Provider ? (
                    <ContractBox web3Provider={web3Provider} deployedContract={connectToDeployedContract(value)} />
                  ) : null}
                </Container>
              </Container>
            );
          }}
        </ViewContext.Consumer>
      </ViewContext.Provider>
    </div>
  );
}
