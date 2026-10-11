import { Noir } from "@noir-lang/noir_js";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { getBytes, hexlify, toBeHex } from "ethers";

export type VoteChoice = 0 | 1;
export type VoterId = "alice" | "bob" | "charlie" | "david";

export interface GeneratedVoteProof {
  proof: Uint8Array;
  publicInputs: string[];
  nullifier: string;
  offChainVerified: boolean;
}

export const MERKLE_ROOT =
  "0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1";

const VOTER_PATHS: Record<VoterId, { merklePath: string[]; pathIndices: boolean[] }> = {
  alice: {
    merklePath: [
      "0x17a984d66ccf4736aab5cdea3664aa8843e424762168785361a2a276de876abd",
      "0x0a5e1a84811af2a57359af50a19e433ee54add6ab7a2fdca6801ffbfe902408a",
    ],
    pathIndices: [false, false],
  },
  bob: {
    merklePath: [
      "0x2cb513a273d7d72f23529be321b42613ae4fb0ebc0874126ec98514ec8619503",
      "0x0a5e1a84811af2a57359af50a19e433ee54add6ab7a2fdca6801ffbfe902408a",
    ],
    pathIndices: [true, false],
  },
  charlie: {
    merklePath: [
      "0x1d1d4f213f5bdcc91759d7d23f91aebb05a052c0739628ec6b5a8f2bec3d0238",
      "0x26adfb66b2111195d3ea17ac065b70dc7601ad26223b33e01047d0ec9d19cbb4",
    ],
    pathIndices: [false, true],
  },
  david: {
    merklePath: [
      "0x0ba426b490482ff41f59ef8406c64afb0190995c9213010245e4a63b0628833b",
      "0x26adfb66b2111195d3ea17ac065b70dc7601ad26223b33e01047d0ec9d19cbb4",
    ],
    pathIndices: [true, true],
  },
};

function fieldBytes(value: string | number): Uint8Array {
  return getBytes(toBeHex(value, 32));
}

export async function generateVoteProof(
  choice: VoteChoice,
  secret: string,
): Promise<GeneratedVoteProof> {
  const response = await fetch("/zk_merkle_voting.json");

  if (!response.ok) {
    throw new Error("Could not load the Noir circuit artifact from public/.");
  }

  const circuit = await response.json();

  const api = await Barretenberg.new();

  const nullifierHash = await api.pedersenHash({
    inputs: [fieldBytes(secret), fieldBytes(1)],
    hashIndex: 0,
  });
  const nullifier = hexlify(nullifierHash.hash);

  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode, api);

  try {
    let witness: Uint8Array | undefined;
    for (const path of Object.values(VOTER_PATHS)) {
      try {
        const { witness: candidate } = await noir.execute({
          secret,
          merkle_path: path.merklePath,
          path_indices: path.pathIndices,
          vote_choice: String(choice),
          merkle_root: MERKLE_ROOT,
          poll_id: "1",
          nullifier,
        });
        witness = candidate;
        break;
      } catch {
        // A failed witness means this secret does not match this path.
      }
    }

    if (!witness) {
      throw new Error("The secret is not an eligible voter credential.");
    }

    const result = await backend.generateProof(witness, {
      verifierTarget: "evm",
    });
    const offChainVerified = await backend.verifyProof(result, {
      verifierTarget: "evm",
    });

    if (!offChainVerified) {
      throw new Error("The generated proof failed local verification.");
    }

    return {
      proof: result.proof,
      publicInputs: result.publicInputs.map(String),
      nullifier,
      offChainVerified,
    };
  } finally {
    await api.destroy();
  }
}