// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {Voting} from "../src/Voting.sol";

contract Deploy is Script {
    function run() external returns (HonkVerifier verifier, Voting voting) {

        // Replace with your actual Merkle root.
        bytes32 merkleRoot =
            0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1;

        uint256 pollId = 1;

        vm.startBroadcast();

        verifier = new HonkVerifier();
        voting = new Voting(address(verifier), merkleRoot, pollId);

        vm.stopBroadcast();
    }
}