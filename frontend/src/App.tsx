
import { useState } from "react";
import { BrowserProvider, Contract, toBeHex } from "ethers";
import "./App.css";
import { generateVoteProof, MERKLE_ROOT } from "./zk";
import type { VoteChoice } from "./zk";

const SEPOLIA_CHAIN_ID = "0xaa36a7";
const VERIFIER_ADDRESS = "0xa768B1161d241f7b6eE2b05FC405F4c6C0EF24EA";
const VOTING_ADDRESS = "0xa955Ad299223b606c9d2daC22450CE8808Dd7b8E";
const VERIFIER_ABI = [
  "function verify(bytes proof, bytes32[] publicInputs) view returns (bool)",
];
const VOTING_ABI = [
  "function merkleRoot() view returns (bytes32)",
  "function pollId() view returns (uint256)",
  "function nullifierUsed(bytes32) view returns (bool)",
  "function yesVotes() view returns (uint256)",
  "function noVotes() view returns (uint256)",
  "function vote(bytes proof, bytes32 nullifier, uint256 voteChoice)",
];

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState(
    "Connect your wallet to participate in the poll."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  async function connectWallet() {
    const ethereum = window.ethereum;

    if (!ethereum) {
      setStatus("MetaMask not detected. Please install MetaMask.");
      return;
    }

    try {
      const result = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (
        !Array.isArray(result) ||
        !result.every(
          (value): value is string => typeof value === "string"
        )
      ) {
        throw new Error("MetaMask returned an invalid account list.");
      }

      if (result.length === 0) {
        setStatus("No wallet account was returned.");
        return;
      }

      setAccount(result[0]);
      const chainId = await ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch {
          setStatus("Please switch MetaMask to Sepolia to continue.");
          return;
        }
      }
      setStatus("Wallet connected on Sepolia. Select your vote.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Wallet connection failed."
      );
    }
  }

  async function handleVote() {
    if (!account) {
      setStatus("Connect your wallet first.");
      return;
    }

    if (choice === null) {
      setStatus("Please select Yes or No.");
      return;
    }

    if (!/^\d+$/.test(secret)) {
      setStatus("Enter your numeric voter secret.");
      return;
    }

    if (isGenerating) return;

    setIsGenerating(true);
    setTransactionHash(null);
    setStatus("Generating your zero-knowledge proof. Please wait...");

    try {
      const result = await generateVoteProof(choice, secret);
      setStatus("Proof verified locally. Checking the on-chain verifier...");

      if (!window.ethereum) {
        throw new Error("MetaMask is no longer available.");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const verifier = new Contract(VERIFIER_ADDRESS, VERIFIER_ABI, provider);
      const voting = new Contract(VOTING_ADDRESS, VOTING_ABI, signer);
      const chainId = (await provider.getNetwork()).chainId;

      if (chainId !== 11155111n) {
        throw new Error("Please switch MetaMask to Sepolia.");
      }

      const [onChainRoot, onChainPollId, alreadyUsed] = await Promise.all([
        voting.merkleRoot() as Promise<string>,
        voting.pollId() as Promise<bigint>,
        voting.nullifierUsed(result.nullifier) as Promise<boolean>,
      ]);

      if (onChainRoot.toLowerCase() !== MERKLE_ROOT.toLowerCase()) {
        throw new Error("The connected contract uses a different Merkle root.");
      }

      if (onChainPollId !== 1n) {
        throw new Error("The connected contract uses a different poll.");
      }

      const onChainVerified = await verifier.verify(
        result.proof,
        result.publicInputs.map((input) => toBeHex(BigInt(input), 32)),
      );

      if (!onChainVerified) {
        throw new Error("The deployed verifier rejected the proof.");
      }

      if (alreadyUsed) {
        throw new Error("This nullifier has already been used.");
      }

      setStatus("Proof verified locally and on-chain. Confirm the vote in MetaMask...");
      const transaction = await voting.vote(result.proof, result.nullifier, choice);
      setTransactionHash(transaction.hash);
      setStatus("Vote submitted. Waiting for Sepolia confirmation...");
      await transaction.wait();

      setStatus(
        `Vote confirmed on Sepolia. Local and on-chain verification passed.`
      );
    } catch (error) {
      console.error("Proof generation failed:", error);
      setStatus(
        `Proof generation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <nav className="navbar">
        <a className="brand" href="/">
          <span className="brand-mark">ZK</span>
          <span>VeilVote</span>
        </a>

        <span className="network-label">
          <span className="network-dot" />
          Private voting
        </span>

        <button className="connect-button" onClick={connectWallet}>
          {account
            ? `${account.slice(0, 6)}...${account.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span className="eyebrow-line" />
          PRIVACY-FIRST GOVERNANCE
        </div>

        <h1>
          Your vote.
          <br />
          <span>Your secret.</span>
        </h1>

        <p className="hero-description">
          Prove you're eligible to vote without revealing who you are.
          One person, one vote, powered by zero-knowledge proofs.
        </p>

        <div className="privacy-pill">
          <span>◈</span>
          Identity private · Vote verifiable
        </div>
      </section>

      <section className="voting-layout">
        <div className="poll-card">
          <div className="card-topline">
            <span className="section-label">CURRENT POLL</span>
            <span className="active-tag">
              <span className="active-dot" />
              Active
            </span>
          </div>

          <h2>Should this community adopt the proposal?</h2>
          <p className="poll-description">
            Cast your vote privately. Your identity and voting eligibility
            remain protected by zero-knowledge proofs.
          </p>

          <div className="poll-meta">
            <div>
              <span className="meta-label">POLL ID</span>
              <strong>#1</strong>
            </div>
            <div>
              <span className="meta-label">ELIGIBILITY</span>
              <strong>Merkle proof</strong>
            </div>
            <div>
              <span className="meta-label">PRIVACY</span>
              <strong>Zero knowledge</strong>
            </div>
          </div>

          <div className="divider" />
          <span className="section-label">VOTER CREDENTIAL</span>

          <label className="credential-label" htmlFor="secret">
            Secret
            <input
              id="secret"
              type="password"
              inputMode="numeric"
              value={secret}
              disabled={isGenerating}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Enter your voter secret"
              autoComplete="off"
            />
            <small>Kept in this browser and used only to generate the proof.</small>
          </label>

          <div className="divider" />
          <span className="section-label">YOUR CHOICE</span>

          <div className="vote-options">
            <button
              className={`vote-option ${choice === 1 ? "selected yes" : ""}`}
              disabled={isGenerating}
              onClick={() => setChoice(1)}
            >
              <span className="option-icon">✓</span>
              <span className="option-copy">
                <strong>Yes</strong>
                <small>Support the proposal</small>
              </span>
              <span className="radio-indicator" />
            </button>

            <button
              className={`vote-option ${choice === 0 ? "selected no" : ""}`}
              disabled={isGenerating}
              onClick={() => setChoice(0)}
            >
              <span className="option-icon no-icon">×</span>
              <span className="option-copy">
                <strong>No</strong>
                <small>Reject the proposal</small>
              </span>
              <span className="radio-indicator" />
            </button>
          </div>

          <button
            className="submit-button"
            onClick={handleVote}
            disabled={isGenerating}
          >
            {isGenerating ? "Verifying & submitting..." : "Cast private vote"}
            <span>{isGenerating ? "◌" : "↗"}</span>
          </button>

          <p className="status-message" aria-live="polite">
            <span className="status-icon">◈</span>
            {status}
          </p>
          {transactionHash && (
            <a
              className="transaction-link"
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction on Etherscan ↗
            </a>
          )}
        </div>

        <aside className="privacy-card">
          <div className="shield-icon">◇</div>
          <span className="section-label">HOW IT WORKS</span>
          <h3>Trust the proof, not the identity.</h3>

          <div className="step-list">
            <div className="step">
              <span className="step-number">01</span>
              <div>
                <strong>Prove eligibility</strong>
                <p>A Merkle proof verifies membership in the voter set.</p>
              </div>
            </div>

            <div className="step">
              <span className="step-number">02</span>
              <div>
                <strong>Generate a ZK proof</strong>
                <p>Prove eligibility without exposing your secret.</p>
              </div>
            </div>

            <div className="step">
              <span className="step-number">03</span>
              <div>
                <strong>Prevent double voting</strong>
                <p>A poll-specific nullifier blocks repeat submissions.</p>
              </div>
            </div>
          </div>

          <div className="tech-stack">
            <span>Noir</span>
            <span>UltraHonk</span>
            <span>Solidity</span>
          </div>
        </aside>
      </section>

      <footer>
        <span>VEILVOTE · ZERO-KNOWLEDGE GOVERNANCE</span>
        <span>Built for private participation.</span>
      </footer>
    </main>
  );
}

export default App;