
import { useState } from "react";
import "./App.css";
import { generateVoteProof } from "./zk";
import type { VoteChoice } from "./zk";

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [status, setStatus] = useState(
    "Connect your wallet to participate in the poll."
  );
  const [isGenerating, setIsGenerating] = useState(false);

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
      setStatus("Wallet connected. Select your vote.");
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

    if (isGenerating) return;

    setIsGenerating(true);
    setStatus("Generating your zero-knowledge proof. Please wait...");

    try {
      const result = await generateVoteProof(choice);

      setStatus(
        `Proof generated! Public inputs: ${result.publicInputs.length}. No transaction submitted.`
      );

      console.log("Generated proof:", {
        proofBytes: result.proof.length,
        publicInputs: result.publicInputs,
        nullifier: result.nullifier,
      });
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
            {isGenerating ? "Generating proof..." : "Prepare private vote"}
            <span>{isGenerating ? "◌" : "↗"}</span>
          </button>

          <p className="status-message" aria-live="polite">
            <span className="status-icon">◈</span>
            {status}
          </p>
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