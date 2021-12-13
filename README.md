# SpaceCoin Initial Coin Offering with Liquidity Pool Support

This project aims to raise 30kΞ through an Initial Coin Offering (ICO). There are 3 phases:

1. **Seed Phase:** Must belong to whitelist. Max Individual contribution of 1,500Ξ, Max Total Contribution: 15kΞ
2. **General Phase:** Open to the public. Max Individual Contribution: 1000Ξ, Max Total Contribution: 30kΞ.
3. **Open Phase:** Open to the public, max supply of 500k Space Coin. Space Coin Distribution happens at rate of 5 token per ether.

Project includes a liquidity pool for trading wrapped Ether and Space Coin.

## Implementation

This project uses the following technologies and tools:

- Solidity for smart contracts development
- React for frontend rendering
- Typescript for backend tests and frontend
- Hardhat for backend testing
- Ethers.js for easily accessing backend EVM networks
- Typechain for type-friendly backend testing and frontend development
- ESLint, Prettier, Solhint for code styling
- CommitLint, Commitizen for better commit messages
- Solcover for code coverage

## Contracts

There are 5 contracts:

- `space-coin.sol` contains the ERC-20 implementation for Space Coin
- `space-coin-ico.sol` contains the logic for the Initial Coin Offering
- `wrapped-eth.sol` contains a simple wrapped Ether implementation, with a faucet. **Only to be used for testing**
- `space-coin-weth-pair.sol` contains the LP pool for Space Coin and WETH. Supports adding liquidity in exchange for LP tokens as well as swaps.
- `space-coin-router.sol` a convenience router made for interacting with the liquidity pool. _Users are not required to use the router but may find it easier to do so._

# Getting Started

Copy the `.env.sample` file to `.env` and fill in the infura API key and a 12 word mnemonic values with your own values

Run `yarn install` & `yarn run typechain` from the root directory to install proper dependencies for the solidity backend

Run `yarn install` & `yarn run typechain` from the `./frontend` directory to install the proper dependencies for the front end

### Backend

To launch the backend locally, run `yarn run hardhat node` to launch a local hardhat network

Separately run `yarn run hardhat run scripts/deploy.ts`

### Front End

To launch the frontend locally run `yarn run start` from the `./frontend` directory which will be available at `localhost:3000`

The front end is a small scaffold which is dynamically rendered using the typechain and ABI information. Each contract renders a single page which lists all functions for invocation.

To bundle for remote deployment run `yarn run build` which will compile a production-optimized bundle of the frontend

## Commits

This repos uses Commitizen to provide structured and informational commit messages. To make a commit run `yarn run commit` which will provide a walkthough of information rquired for commits
