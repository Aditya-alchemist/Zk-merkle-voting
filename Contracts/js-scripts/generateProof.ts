import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const circuitPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../circuits/target/zk_merkle_voting.json"
);

const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

export default async function generateProof() {
    const bb = await Barretenberg.new();

    const inputs = process.argv.slice(2);

    try {
        const noir = new Noir(circuit);
        const honk = new UltraHonkBackend(circuit.bytecode,bb);

        const input = {
            // Private inputs
            secret: inputs[0],

            merkle_path: [
                inputs[1],
                inputs[2],
            ],

            path_indices: [
                inputs[3] === "true",
                inputs[4] === "true",
            ],

            // Public inputs
            vote_choice: inputs[5],
            merkle_root: inputs[6],
            poll_id: inputs[7],
            nullifier: inputs[8],
        };

        const { witness } = await noir.execute(input);

        const originalLog = console.log;
        console.log = () => {};

        const { proof, publicInputs } =
    await honk.generateProof(witness, {
        verifierTarget: "evm",
    });

        console.log = originalLog;

        const res = ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes", "bytes32[]"],
            [proof, publicInputs]
        );

        return res;
    } catch (error) {
        console.log(error);
        throw error;
    } finally {
        await bb.destroy();
    }
}

(async () => {
    generateProof()
        .then((res) => {
            process.stdout.write(res);
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
})();