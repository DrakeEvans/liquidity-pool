import { Navbar, Container, Button, Form, Col, Row } from "react-bootstrap";
import FunctionRow from "./FunctionRow";
import { Contract, utils } from "ethers"

interface Props {
  deployedContract: Contract & utils.Interface
  web3Provider: any
}

export default function ContractBox(props: Props) {
  if (!props.deployedContract) return null
  console.log(props.deployedContract)
  return (
    <Container>
      <Row>
          <div>{`Contract Deployed At: ${props.deployedContract.address}`}</div>
      </Row>
      {Object.entries(props.deployedContract.interface.functions).map(([key, entry], index) => (<FunctionRow function={props.deployedContract.functions[key]} contractEntry={entry} key={key + index.toString()} />))}
    </Container>
  );
}