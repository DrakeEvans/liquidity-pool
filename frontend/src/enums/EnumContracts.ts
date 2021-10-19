import {
  SpaceCoin__factory,
  SpaceCoinIco__factory,
  SpaceCoinEthPair__factory,
  SpaceCoinRouter__factory,
} from "../types";

export default class EnumContracts {
  static spaceCoin = {
    factory: SpaceCoin__factory,
    envKey: "REACT_APP_SPACE_COIN_ADDRESS",
  };
  static spaceCoinIco = {
    factory: SpaceCoinIco__factory,
    envKey: "REACT_APP_SPACE_COIN_ICO_ADDRESS",
  };
  static wrappedEth = {
    factory: SpaceCoinRouter__factory,
    envKey: "REACT_APP_WRAPPED_ETH_ADDRESS",
  };
  static spaceCoinEthPair = {
    factory: SpaceCoinEthPair__factory,
    envKey: "REACT_APP_SPACE_COIN_ETH_PAIR_ADDRESS",
  };
  static spaceCoinRouter = {
    factory: SpaceCoinRouter__factory,
    envKey: "REACT_APP_SPACE_COIN_ROUTER_ADDRESS",
  };
}
