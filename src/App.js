import './App.css';
import { ethers } from "ethers";
import React from 'react';
import {Button, ProgressBar, Modal, Spinner, Card, CardGroup} from 'react-bootstrap';
import {Backdrop, CircularProgress} from '@mui/material/';
import 'bootstrap/dist/css/bootstrap.min.css';
import published_contract from "./contracts/artifacts/Platform.json";

const contractAddr = "0xc33Dd8f9cF700D7bE765DFbe042535d6eEdb6642";

class LoadingButton extends React.Component {
    render() {
        return (
            <Button variant="secondary" disabled={this.props.loading} onClick={this.props.onClick}>
                {this.props.display_text} {' '}
                {this.props.loading ? <Spinner as="span" animation="grow" variant="primary" size="sm" role="status" aria-hidden="true"/> : ""}
            </Button>
        )
    }
}

class ProjectWriter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modal_name: "",
      modal_deadline: "",
      modal_desc: "",
      modal_target: "",
      project_id: "",
      project_init: false,
      waiting: false,
    }
    this.project_create = this.project_create.bind(this);
    this.project_init = this.project_init.bind(this);
    this.createProject = this.createProject.bind(this);
    this.initProject = this.initProject.bind(this);
  }

  project_create() {
    return (
      <Modal show={this.props.show_modal} onHide={this.props.showModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Project</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          What will be the name for the new project?
          <input id="modal_name" placeholder="Name of project" value={this.state.modal_name} onChange={(event) => {this.setState({modal_name: event.target.value})}}/>
        </Modal.Body>
        <Modal.Body>
          When will be the deadline for the project?
          <input id="modal_deadline" placeholder="No. of days (1,2,3...)" value={this.state.modal_deadline} onChange={(event) => {this.setState({modal_deadline: event.target.value})}} onBeforeInput={(e)=> {if (!/[0-9]/.test(e.data)) {e.preventDefault();}}}/>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.props.showModal}>Close</Button>
          <LoadingButton display_text="Create" loading={this.state.waiting} onClick={this.createProject}/>
        </Modal.Footer>
      </Modal>
    )
  }

  project_init() {
    return (
      <Modal show={this.props.show_modal} onHide={this.props.showModal}>
      <Modal.Header closeButton>
        <Modal.Title>Initialize your project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Give a brief description of your project.
        <input id="modal_init_desc" placeholder="Project description" value={this.state.modal_desc} onChange={(event) => {this.setState({modal_desc: event.target.value})}}/>
      </Modal.Body>
      <Modal.Body>
        What will be your funding goal?
        <input id="modal_init_target" placeholder="Funding goal (In ETH)" value={this.state.modal_target} onChange={(event) => {this.setState({modal_target: event.target.value})}} onBeforeInput={(e)=> {if (!/([0-9]|\.)/.test(e.data)) {e.preventDefault();}}}/>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={this.props.showModal}>Close</Button>
        <LoadingButton display_text="Create" loading={this.state.waiting} onClick={this.initProject}/>
      </Modal.Footer>
    </Modal>
    )
  }

  async createProject() {
    this.setState({waiting: true});
    try {
      let transaction = await this.props.contract.createProject(this.state.modal_name, this.state.modal_deadline);
      this.props.contract.on("projectCreated", (owner, id) => {
        this.setState({waiting: false});
        this.setState({project_id: parseInt(id)});
        console.log(owner, id)
        console.log(transaction)
        console.log("Transaction completed");
        this.setState({project_init: true, modal_name: "", modal_deadline: ""});
      })
    }
    catch (err) {
      console.log(err);
      this.setState({waiting: false});
      this.setState({modal_name: "", modal_deadline: ""});
    }
  }

  async initProject() {
    this.setState({waiting: true});
    try {
      let transaction = this.props.contract.setProjectDescription(this.state.project_id, this.state.modal_desc);
      transaction = await this.props.contract.setTarget(this.state.project_id, ethers.parseEther(this.state.modal_target));
      await transaction.wait();
      this.setState({waiting: false});
      this.props.getProjects();
      this.props.showModal();
    }
    catch (err) {
      console.log(err);
      this.setState({waiting: false});
    }
    this.setState({modal_desc: "", modal_target: "", project_init: false});
  }


  render() {
    return (
      this.state.project_init ? this.project_init() : this.project_create()
    )
  }
}

class ProjectContent extends React.Component {
  constructor(props){
      super(props);
      this.deposit = this.deposit.bind(this);
      this.withdraw = this.withdraw.bind(this);
      this.claimMoney = this.claimMoney.bind(this);
      this.showModal = this.showModal.bind(this);
      this.state = {
          amount: "",
          show_modal: false,
          waiting: false,
      }
  }
  async deposit() {
      this.setState({waiting: true});
      try {
        let transaction = await this.props.contract.deposit(this.props.id, {value: ethers.parseEther(this.state.amount)})
        transaction.wait().then(() => {
            console.log("Transaction completed");
            this.showModal();
            this.props.reload(this.props.id);
            this.setState({waiting: false, amount: ""});
          }
        )
      }
      catch (err) {
        console.log(err);
        this.setState({waiting: false, amount: ""});
      }
  }
  async withdraw() {
      try {
        let transaction = await this.props.contract.withdraw(this.props.id);
        transaction.wait().then(() => {
          console.log("Transaction completed");
          this.props.reload(this.props.id);
        })
      }
      catch (err) {
        console.log(err);
      }
  }
  async claimMoney() {
      //let transaction = await this.props.contract.withdraw(this.props.id, ethers.parseEther("0.0000011111"));
      let transaction = await this.props.contract.claimMoney(this.props.id);
      transaction.wait().then(() => {
        console.log("Transaction completed");
        this.props.reload(this.props.id);
      }
    )
  }
  showModal() {
    this.setState({show_modal: !this.state.show_modal});
  }

  render() {
      let progress;
      // eslint-disable-next-line
      if (this.props.content.target == 0 || this.props.content.raised == 0) {
          progress = 0;
      }
      else {
          progress = parseInt(this.props.content.raised) / parseInt(this.props.content.target) * 100;
      }
      let date = new Date(parseInt(this.props.content.end) * 1000);
      let date_str = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
      let date_passed = parseInt(this.props.content.end) * 1000 < Date.now();
      return (
          <>
          <Modal show={this.state.show_modal} onHide={this.showModal}>
            <Modal.Header closeButton>
              <Modal.Title>{this.props.content.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Owner: {this.props.content.owner}
            </Modal.Body>
            <Modal.Body>
              Description: {this.props.content.desc}
            </Modal.Body>
            <Modal.Body>
              Raised: {ethers.formatEther(this.props.content.raised)}
            </Modal.Body>
            <Modal.Body>
              Target: {ethers.formatEther(this.props.content.target)}
            </Modal.Body>
            <Modal.Body>
              <ProgressBar animated now={progress} label={`${progress}%`} />
            </Modal.Body>
            <Modal.Body>
              Deadline: {date_str}
            </Modal.Body>
            <Modal.Footer>
              <input id={"donation_" + this.props.id} value={this.state.amount} onChange={(event) => {this.setState({amount: event.target.value})}}></input>
              <LoadingButton id={"button_" + this.props.id} display_text="Sponsor" loading={this.state.waiting} onClick={this.deposit}/>
              {((this.props.content.owner.toLowerCase() === this.props.content.user) && (date_passed)) ? <button onClick={this.claimMoney}>Claim money</button> : ""}
              {((this.props.content.owner.toLowerCase() !== this.props.content.user) && (date_passed)) ? <button onClick={this.withdraw}>Claim refund</button> : ""}
              <Button variant="secondary" onClick={this.showModal}>Close</Button>
            </Modal.Footer>
          </Modal>
  
          <Card className="projectCard" id={"project_" + this.props.id} onClick={this.showModal}>
            <Card.Body>
              <Card.Title>{this.props.content.name}</Card.Title>
              <Card.Subtitle className="card_address">Owner: {this.props.content.owner}</Card.Subtitle>
              <Card.Text>{this.props.content.desc}</Card.Text>
              <ProgressBar striped variant="info" now={progress} />
            </Card.Body>
            <Card.Footer>Expire: {date_str}</Card.Footer>
          </Card>
          </>
      )
  }
}

class TopNavigation extends React.Component {
    constructor(props) {
        super(props);
        console.log(props)
        this.login_logout = this.login_logout.bind(this);
        this.walletInteraction = this.walletInteraction.bind(this);
        this.state = {
            account: "",
        }
    }

    async walletInteraction() {
      if (!window.ethereum) {
        window.alert("No web3 wallet found");
        return;
      }
      try {
        if (this.props.connected) {
          await window.ethereum.request({ method: 'eth_requestAccounts', params: [{ eth_accounts: [] }] });
          this.props.setConnectionState("", false);
        }
        else {
          let accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length !== 0) {
              const account = accounts[0];
              const provider = new ethers.BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              const contract = new ethers.Contract(contractAddr, published_contract.abi, signer);
              this.setState({account: account});
              this.props.setConnectionState(account, true, contract);
          }
        }
      }
      catch (err) {
        console.log(err);
      }
    }

    login_logout() {
        if (this.props.connected) {
            return (<><Button variant="success" id="connect_wallet" onClick={this.walletInteraction}>Disconnect</Button><Button variant="secondary" id="wallet_addr">{this.state.account}</Button></>)
        }
        else{
            return (<Button variant="primary" id="connect_wallet" onClick={this.walletInteraction}>Connect to Wallet</Button>)
        }
    }

    render() {
        return (
            <div className="topNav">
                <span id="proj_Name">UnityHub</span>
                {this.login_logout()}
            </div>
        )
    }
}

class MainContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projects: [],
            show_modal: false,
            modal_name: "",
            modal_deadline: "",
            waiting: false,
            finish_load: false,
        }
        this.showModal = this.showModal.bind(this);
        this.getProjects = this.getProjects.bind(this);
        this.getProjectDetails = this.getProjectDetails.bind(this);
        this.reloadProjects = this.reloadProjects.bind(this);
        //this.createProject = this.createProject.bind(this);

    }
    componentDidMount() {
      console.log("Component mounted");
      this.getProjects();
    }
    componentWillUnmount() {
      console.log("Component unmounted");
      this.setState({projects: []});
    }
    componentDidUpdate(old_state, new_state) {
        // eslint-disable-next-line
        if (old_state.contract == this.props.contract)  {return;}
        console.log(old_state)
        console.log(new_state)
        this.getProjects();
    }

    showModal() {
        this.setState({show_modal: !this.state.show_modal});
        if (this.state.show_modal) {this.setState({modal_name: "", modal_deadline: ""});}
    }

    async getProjectDetails(_id) {
      if (!this.props.contract) {return;}
      let output = {};
      try {
        output.owner = await this.props.contract.getOwner(_id);
        output.desc = await this.props.contract.getProjectDescription(_id);
        output.name = await this.props.contract.getProjectName(_id);
        output.raised = await this.props.contract.getRaised(_id);
        output.target = await this.props.contract.getTarget(_id);
        output.end = await this.props.contract.getReleaseTime(_id);
        output.user = this.props.user;
        return output;
      }
      catch (err) {
        console.log(err);
      }
    }

    async getProjects() {
        console.log(this.props.contract)
        if (!this.props.contract) {return;}
        let temp_projects = [];
        try {
            this.setState({finish_load: false});
            let number_of_projects = await this.props.contract.getNextid();
            for (let i = 0; i < number_of_projects; i++) {
                let temp = await this.getProjectDetails(i);
                temp_projects.push(<ProjectContent id={i} content={temp} contract={this.props.contract} reload={this.reloadProjects}/>)
                //temp_projects.push(<ProjectContent id ={i} name={project_name} owner={project_owner} description={project_desc} funds={project_raised} target={project_target} end={project_end} contract={this.props.contract}/>);
            }
            this.setState({projects: temp_projects});
        }
        catch (err) {
            console.log(err);
        }
        this.setState({finish_load: true});
    }

    async reloadProjects(_id) {
        if (!this.props.contract) {return;}
        let temp = await this.getProjectDetails(_id);
        let temp_projects = this.state.projects;
        temp_projects[_id] = <ProjectContent id={_id} content={temp} contract={this.props.contract} reload={this.reloadProjects}/>;
        this.setState({projects: temp_projects});
    }

    render() {
        let grouped_projects = [];
        for (let i = 0; i < this.state.projects.length; i+=3) {
            grouped_projects.push(this.state.projects.slice(i, i+3));
        }
        return (
            <div className="mainContent">
                <div id="create_button">
                  {this.state.finish_load ? <Button variant="primary" onClick={this.showModal}>Create Project</Button> : ""}
                </div>
                <ProjectWriter show_modal={this.state.show_modal} showModal={this.showModal} contract={this.props.contract} getProjects={this.getProjects}/>
                {
                    this.state.finish_load ? grouped_projects.map((group) => {return <CardGroup>{group.map((element) => {return element;})}</CardGroup>}) : 
                    <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }} open={true}>
                      <span>Please wait while projects are being retrieved.</span>
                      <CircularProgress color="inherit" />
                    </Backdrop>
                    //<Spinner animation="border" role="status"/>
                }
            </div>
        )
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            account: '',
            connected: false,
            contract: null,
        }
        this.setConnectionState = this.setConnectionState.bind(this);
    }

    setConnectionState(_account, _connected, _contract=null) {
      this.setState({account: _account});
      this.setState({connected: _connected});
      if (_contract) {
        this.setState({contract: _contract});
      }
    }

    render() {
        return (
            <div className="mainClass">
                <TopNavigation connected={this.state.connected} setConnectionState={this.setConnectionState}/>
                {this.state.account ? <MainContent contract={this.state.contract} user={this.state.account}/> : ""}
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
            </div>
        )
    }
}

export default App;
