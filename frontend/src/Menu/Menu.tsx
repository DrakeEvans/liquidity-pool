import { Navbar, Container, Button } from "react-bootstrap";
import { Web3Provider } from '@ethersproject/providers'
import { Dispatch, SetStateAction } from "react";
import { EnumView } from '../App'

interface Props {
  web3Provider: Web3Provider | null
  connectToMetaMask: () => {}
  view: string
  setView: Dispatch<SetStateAction<string>>
}

function Menu(props: Props ) {

  function renderButtons() {
    return Object.entries(EnumView)
      .filter(([key, value]) => typeof value === 'string')
      .map(([key, value]) => (<Button key={key} onClick={() => props.setView(value)} variant={`${ props.view === value ? '' : 'outline-'}primary`}>{value}</Button>))
  }

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand href="#home">SpaceCoin</Navbar.Brand>
        {renderButtons()}
        {props.web3Provider ? (
          <Button variant="success">Connected To MetaMask</Button>
        ) : (
          <Button variant="warning" onClick={props.connectToMetaMask}>
            Connect To Metamask
          </Button>
        )}
      </Container>
    </Navbar>
  );
}

export default Menu;
