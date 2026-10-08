// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "../forge-std/Test.sol";
import {Voting} from "../src/Voting.sol";
import {HonkVerifier} from "../src/Verifier.sol";

contract VotingTest is Test {
    Voting voting;
    HonkVerifier verifier;
    bytes32[] public publicInputs;

    // Alice's Merkle root from my Noir generator
    bytes32 constant MERKLE_ROOT =
        0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1;

    uint256 constant POLL_ID = 1;

    function setUp() public {
        verifier = new HonkVerifier();

        voting = new Voting(
            address(verifier),
            MERKLE_ROOT,
            POLL_ID
        );
    }

    function testDeployment() public {
        assertEq(address(voting.verifier()), address(verifier));
        assertEq(voting.merkleRoot(), MERKLE_ROOT);
        assertEq(voting.pollId(), POLL_ID);
    }

    function _getProof() internal returns (bytes memory _proof) {
    uint256 NUM_ARGS = 12;

    string[] memory inputs = new string[](NUM_ARGS);

    inputs[0] = "C:\\Program Files\\nodejs\\npx.cmd";
    inputs[1] = "tsx";
    inputs[2] = "js-scripts/generateProof.ts";

    // Private input
    inputs[3] = "123";

    // Merkle path
    inputs[4] =
        "0x17a984d66ccf4736aab5cdea3664aa8843e424762168785361a2a276de876abd";

    inputs[5] =
        "0x0a5e1a84811af2a57359af50a19e433ee54add6ab7a2fdca6801ffbfe902408a";

    // Merkle path indices
    inputs[6] = "false";
    inputs[7] = "false";

    // Vote choice
    inputs[8] = "0";

    // Public inputs
    inputs[9] =
        "0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1";

    inputs[10] = "1";

    inputs[11] =
        "0x098a67f19cb11cff2febb7d027a019fd518acf54ce3990111503d9f5a766a205";

    bytes memory result = vm.ffi(inputs);

    (_proof, publicInputs) =
        abi.decode(result, (bytes, bytes32[]));
}

function testValidVote() public {
    bytes memory proof = _getProof();

    voting.vote(
        proof,
        0x098a67f19cb11cff2febb7d027a019fd518acf54ce3990111503d9f5a766a205,
        0
    );

    assertEq(voting.noVotes(), 1);
    assertEq(voting.yesVotes(), 0);
}
}