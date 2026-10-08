// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVerifier {
    function verify(
        bytes calldata _proof,
        bytes32[] calldata _publicInputs
    ) external view returns (bool);
}

contract Voting {
    IVerifier public immutable verifier;

    bytes32 public immutable merkleRoot;
    uint256 public immutable pollId;

    mapping(bytes32 => bool) public nullifierUsed;

    uint256 public yesVotes;
    uint256 public noVotes;

    constructor(
        address _verifier,
        bytes32 _merkleRoot,
        uint256 _pollId
    ) {
        verifier = IVerifier(_verifier);
        merkleRoot = _merkleRoot;
        pollId = _pollId;
    }

    function vote(
        bytes calldata proof,
        bytes32 nullifier,
        uint256 voteChoice
    ) external {
        require(!nullifierUsed[nullifier], "Already voted");

        require(
            voteChoice == 0 || voteChoice == 1,
            "Invalid vote"
        );

        bytes32[] memory publicInputs = new bytes32[](3);

        publicInputs[0] = merkleRoot;
        publicInputs[1] = bytes32(pollId);
        publicInputs[2] = nullifier;

        bool valid = verifier.verify(
            proof,
            publicInputs
        );

        require(valid, "Invalid ZK proof");

        nullifierUsed[nullifier] = true;

        if (voteChoice == 1) {
            yesVotes++;
        } else {
            noVotes++;
        }
    }
}