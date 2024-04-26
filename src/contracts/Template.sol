pragma solidity ^0.8.18;

contract Template {
    address owner;
    string projectName;
    string projectDescription;
    uint256 target; //Not yet set target
    uint256 raised;
    uint256 releaseTime; // In unix timestamp
    mapping (address => uint256) public balance;

    constructor (address projectOwner, string memory name, uint256 _projectTime) {
        owner = projectOwner;
        projectName = name;
        releaseTime = block.timestamp + _projectTime;
    }

    function setProjectName(string memory name) external {
        require (msg.sender == owner, "Only the owner can set the project name"); 
        projectName = name;
    }

    function setProjectDescription(string memory description) public {
        require (msg.sender == owner, "Only the owner can set the project description"); 
        projectDescription = description;
    }

    function setTarget(uint256 _target) external {
        require (msg.sender == owner, "Only the owner can set the target"); 
        if (target == 0) {
            target = _target;
        }
        else {
            require (_target > target, "Target cannot be reduced.");
            target = _target;
        }
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function getProjectName() public view returns (string memory) {
        return projectName;
    }
    
    function getProjectDescription() public view returns (string memory) {
        return projectDescription;
    }

    function getTarget() external view returns (uint256) {
        return target;
    }

    function getRaised() external view returns (uint256) {
        return raised;
    }

    function getReleaseTime() external view returns (uint256) {
        return releaseTime;
    }

    function deposit() public payable {
        balance[msg.sender] += msg.value;
        raised += msg.value;
    }

    // Function to withdraw funds if project expired and failed.
    function withdraw(uint256 amount) public {
        require (block.timestamp >= releaseTime, "Project has still not expired");
        require (raised < target, "Project has already reached its target");
        require (balance[msg.sender] >= amount, "Insufficient balance");
        balance[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    // Function for project owner to claim all remaining balance.
    function claimMoney() public {
        require (block.timestamp >= releaseTime, "Project has still not expired");
        require (raised >= target, "Project has failed to reach its target");
        require (msg.sender == owner, "Only the owner can claim the money");
        payable(owner).transfer(address(this).balance);
    }

    // 
    function destroy() external {
        require (msg.sender == owner, "Only the owner can destroy the contract");
        selfdestruct(payable(owner));
    }
}