pragma solidity ^0.8.18;

contract Platform{
    address contract_creator;
    uint256 contract_id = 0;
    mapping (uint256 => Project) projects;

    struct Project {
        address owner;
        string projectName;
        string projectDescription;
        uint256 target; //Not yet set target
        uint256 raised;
        uint256 releaseTime; // In unix timestamp
        uint256 wallet;
        mapping (address => uint256) balance;
    }
    event projectCreated(address indexed owner, uint256 indexed project_id);

    constructor () {
        contract_creator = msg.sender;
    }

    function adminFeature(string memory _action, uint256 _contract_id, uint256 _value) external {
        require (msg.sender == contract_creator, "Not permitted");
        if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("setTarget"))) {
            projects[_contract_id].target = _value;
        }
        else if (keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("setReleaseTime"))) {
            projects[_contract_id].releaseTime = _value;
        }
        else {
            revert("Invalid action");
        }
    }

    function test() external view returns (address){
        return contract_creator;
    }

    function createProject(string memory projectName, uint256 no_of_date) external returns (uint256){
        Project storage newProject = projects[contract_id];
        newProject.owner = msg.sender;
        newProject.projectName = projectName;
        newProject.releaseTime = block.timestamp + no_of_date * 86400;
        contract_id += 1;
        emit projectCreated(msg.sender, contract_id-1);
        return (contract_id - 1);
    }

    // Setter
    function setProjectName(uint256 project_id, string memory name) external {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (msg.sender == projects[project_id].owner, "Only the owner can set the project name"); 
        projects[project_id].projectName = name;
    }

    function setProjectDescription(uint256 project_id, string memory description) public {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (msg.sender == projects[project_id].owner, "Only the owner can set the project description"); 
        projects[project_id].projectDescription = description;
    }

    function setTarget(uint256 project_id, uint256 _target) external {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (msg.sender == projects[project_id].owner, "Only the owner can set the target"); 
        if (projects[project_id].target == 0) {
            projects[project_id].target = _target;
        }
        else {
            require (_target > projects[project_id].target, "Target cannot be reduced.");
            projects[project_id].target = _target;
        }
    }

    // Getter
    function getNextid() external view returns (uint256) {
        return contract_id;
    }

    function getOwner(uint256 project_id) external view returns (address) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].owner;
    }

    function getProjectName(uint256 project_id) public view returns (string memory) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].projectName;
    }
    
    function getProjectDescription(uint256 project_id) public view returns (string memory) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].projectDescription;
    }

    function getTarget(uint256 project_id) external view returns (uint256) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].target;
    }

    function getRaised(uint256 project_id) external view returns (uint256) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].raised;
    }

    function getReleaseTime(uint256 project_id) external view returns (uint256) {
        require (projects[project_id].owner != address(0), "Project does not exist");
        return projects[project_id].releaseTime;
    }

    function deposit(uint256 project_id) public payable {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (projects[project_id].target != 0, "Target not yet set");
        projects[project_id].balance[msg.sender] += msg.value;
        projects[project_id].raised += msg.value;
        projects[project_id].wallet += msg.value;
    }
    // Function to withdraw funds if project expired and failed.
    function withdraw(uint256 project_id) public {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (block.timestamp >= projects[project_id].releaseTime, "Project has still not expired");
        require (projects[project_id].raised < projects[project_id].target, "Project has already reached its target");
        require (projects[project_id].balance[msg.sender] >= 0, "Insufficient balance");
        uint256 amount = projects[project_id].balance[msg.sender];
        projects[project_id].balance[msg.sender] = 0;
        projects[project_id].wallet -= amount;
        payable(msg.sender).transfer(amount);
    }

    // Function for project owner to claim all remaining balance.
    function claimMoney(uint256 project_id) public {
        require (projects[project_id].owner != address(0), "Project does not exist");
        require (block.timestamp >= projects[project_id].releaseTime, "Project has still not expired");
        require (projects[project_id].raised >= projects[project_id].target, "Project has failed to reach its target");
        require (msg.sender == projects[project_id].owner, "Only the owner can claim the money");
        require (projects[project_id].wallet > 0, "No money to claim");
        uint256 amount = projects[project_id].wallet;
        projects[project_id].wallet = 0;
        payable(projects[project_id].owner).transfer(amount);
    }
}