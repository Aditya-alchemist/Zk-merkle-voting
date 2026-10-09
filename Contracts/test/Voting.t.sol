// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "../forge-std/Test.sol";
import {Voting} from "../src/Voting.sol";
import {HonkVerifier} from "../src/Verifier.sol";

contract VotingTest is Test {
    Voting internal voting;
    HonkVerifier internal verifier;

    bytes32[] public publicInputs;

    bytes32 internal constant MERKLE_ROOT =
        0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1;

    uint256 internal constant POLL_ID = 1;

    bytes32 internal constant ALICE_NULLIFIER =
        0x098a67f19cb11cff2febb7d027a019fd518acf54ce3990111503d9f5a766a205;

    function setUp() public {
        verifier = new HonkVerifier();

        voting = new Voting(
            address(verifier),
            MERKLE_ROOT,
            POLL_ID
        );
    }

    // ------------------------------------------------------------
    // Deployment
    // ------------------------------------------------------------

    function testDeployment() public view {
        assertEq(address(voting.verifier()), address(verifier));
        assertEq(voting.merkleRoot(), MERKLE_ROOT);
        assertEq(voting.pollId(), POLL_ID);
    }

    // ------------------------------------------------------------
    // Real ZK proof generation through TypeScript and Foundry FFI
    // ------------------------------------------------------------

    function _getProof(
        uint256 voteChoice
    ) internal returns (bytes memory proof) {
        uint256 NUM_ARGS = 12;
        string[] memory inputs = new string[](NUM_ARGS);

        inputs[0] = "C:\\Program Files\\nodejs\\npx.cmd";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateProof.ts";

        // Alice's private secret.
        inputs[3] = "123";

        // Alice's Merkle path.
        inputs[4] =
            "0x17a984d66ccf4736aab5cdea3664aa8843e424762168785361a2a276de876abd";

        inputs[5] =
            "0x0a5e1a84811af2a57359af50a19e433ee54add6ab7a2fdca6801ffbfe902408a";

        // Merkle path indices.
        inputs[6] = "false";
        inputs[7] = "false";

        // Vote choice: 0 = no, 1 = yes.
        inputs[8] = vm.toString(voteChoice);

        // Public Merkle root.
        inputs[9] =
            "0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1";

        // Poll ID.
        inputs[10] = "1";

        // Alice's nullifier for poll 1.
        inputs[11] =
            "0x098a67f19cb11cff2febb7d027a019fd518acf54ce3990111503d9f5a766a205";

        bytes memory result = vm.ffi(inputs);

        (proof, publicInputs) = abi.decode(
            result,
            (bytes, bytes32[])
        );
    }

    // ------------------------------------------------------------
    // Valid voting
    // ------------------------------------------------------------

    function testValidVote() public {
        bytes memory proof = _getProof(0);

        voting.vote(proof, ALICE_NULLIFIER, 0);

        assertEq(voting.noVotes(), 1);
        assertEq(voting.yesVotes(), 0);
        assertTrue(voting.nullifierUsed(ALICE_NULLIFIER));
    }

    function testValidYesVote() public {
        bytes memory proof = _getProof(1);

        voting.vote(proof, ALICE_NULLIFIER, 1);

        assertEq(voting.yesVotes(), 1);
        assertEq(voting.noVotes(), 0);
        assertTrue(voting.nullifierUsed(ALICE_NULLIFIER));
    }

    // ------------------------------------------------------------
    // Double-voting prevention
    // ------------------------------------------------------------

    function testCannotVoteTwice() public {
        bytes memory proof = _getProof(0);

        voting.vote(proof, ALICE_NULLIFIER, 0);

        assertEq(voting.noVotes(), 1);

        // The nullifier check happens before proof verification.
        vm.expectRevert(bytes("Already voted"));

        voting.vote(hex"", ALICE_NULLIFIER, 0);

        assertEq(voting.noVotes(), 1);
        assertEq(voting.yesVotes(), 0);
    }

    // ------------------------------------------------------------
    // Input validation
    // ------------------------------------------------------------

    function testInvalidVoteChoiceReverts() public {
        vm.expectRevert(bytes("Invalid vote"));

        voting.vote(hex"", ALICE_NULLIFIER, 2);
    }

    // ------------------------------------------------------------
    // Malformed proof
    // ------------------------------------------------------------

    function testInvalidProofReverts() public {
        // The generated verifier may revert with its own custom error.
        vm.expectRevert();

        voting.vote(hex"1234", ALICE_NULLIFIER, 0);
    }

    function testInvalidProofDoesNotConsumeNullifier() public {
        vm.expectRevert();

        voting.vote(hex"1234", ALICE_NULLIFIER, 0);

        // A reverted transaction must not change contract state.
        assertFalse(voting.nullifierUsed(ALICE_NULLIFIER));
        assertEq(voting.noVotes(), 0);
        assertEq(voting.yesVotes(), 0);
    }

    // ------------------------------------------------------------
    // Public-input binding
    // ------------------------------------------------------------

    function testWrongNullifierReverts() public {
        bytes memory proof = _getProof(0);
        bytes32 wrongNullifier = bytes32(uint256(999));

        // The proof was generated for ALICE_NULLIFIER, not this value.
        vm.expectRevert();

        voting.vote(proof, wrongNullifier, 0);

        assertEq(voting.noVotes(), 0);
        assertEq(voting.yesVotes(), 0);
        assertFalse(voting.nullifierUsed(wrongNullifier));
    }
}