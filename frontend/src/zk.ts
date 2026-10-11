import { Noir } from "@noir-lang/noir_js";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";

export type VoteChoice = 0 | 1;

export interface GeneratedVoteProof {
  proof: Uint8Array;
  publicInputs: string[];
  nullifier: string;
}

const MERKLE_ROOT =
  "0x0eb0099d63346709ad8d46ec374e850cd1df95d4181874f1784b87a4628abbe1";

const ALICE_NULLIFIER =
  "0x098a67f19cb11cff2febb7d027a019fd518acf54ce3990111503d9f5a766a205";

export async function generateVoteProof(
  choice: VoteChoice,
): Promise<GeneratedVoteProof> {
  const response = await fetch("/zk_merkle_voting.json");

  if (!response.ok) {
    throw new Error("Could not load the Noir circuit artifact from public/.");
  }

  const circuit = await response.json();

  const input = {
    secret: "123",
    merkle_path: [
      "0x17a984d66ccf4736aab5cdea3664aa8843e424762168785361a2a276de876abd",
      "0x0a5e1a84811af2a57359af50a19e433ee54add6ab7a2fdca6801ffbfe902408a",
    ],
    path_indices: [false, false],
    vote_choice: String(choice),
    merkle_root: MERKLE_ROOT,
    poll_id: "1",
    nullifier: ALICE_NULLIFIER,
  };

  const noir = new Noir(circuit);
  const { witness } = await noir.execute(input);

  const api = await Barretenberg.new();
  const backend = new UltraHonkBackend(circuit.bytecode, api);

  try {
    const result = await backend.generateProof(witness, {
      verifierTarget: "evm",
    });

    return {
      proof: result.proof,
      publicInputs: result.publicInputs.map(String),
      nullifier: ALICE_NULLIFIER,
    };
  } finally {
    await api.destroy();
  }
}