export default class EnumView {
  static spaceCoin = "Space Coin";
  static spaceCoinIco = "Space Coin Ico";
  static wrappedEth = "Wrapped Ether";
  static spaceCoinEthPair = "Space Coin Eth Pair";
  static spaceCoinRouter = "Space Coin Router";
  static getKey = value => Object.entries(EnumView).find(([key, val]) => value === val)?.[0];
}
