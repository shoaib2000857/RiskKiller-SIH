"use client";

import { useState, useEffect } from "react";

const NODE_URLS = {
  USA: "http://localhost:8001",
  EU: "http://localhost:8002",
  IN: "http://localhost:8003",
  AUS: "http://localhost:8004",
};

export default function FederatedBlockchain() {
  const [chain, setChain] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedNode, setSelectedNode] = useState("USA");
  const [decryptedData, setDecryptedData] = useState({});
  const [decrypting, setDecrypting] = useState({});

  const fetchChain = async () => {
    try {
      const nodeUrl = NODE_URLS[selectedNode];
      const res = await fetch(`${nodeUrl}/api/v1/federated/chain`);
      const data = await res.json();
      setChain(data.chain || []);
    } catch (error) {
      console.error("Failed to fetch blockchain:", error);
    }
  };

  const validateChain = async () => {
    setLoading(true);
    try {
      const nodeUrl = NODE_URLS[selectedNode];
      const res = await fetch(`${nodeUrl}/api/v1/federated/validate_local`);
      const data = await res.json();
      setValidation({ ...data, node: selectedNode });
    } catch (error) {
      console.error("Failed to validate blockchain:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncChain = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const nodeUrl = NODE_URLS[selectedNode];
      const res = await fetch(`${nodeUrl}/api/v1/federated/sync_chain`, {
        method: "POST",
      });
      const data = await res.json();
      setSyncResult({ ...data, node: selectedNode });
      // Refresh chain and validation after sync
      await fetchChain();
      await validateChain();
    } catch (error) {
      console.error("Failed to sync blockchain:", error);
      setSyncResult({ error: error.message || "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const decryptBlock = async (blockIndex) => {
    setDecrypting(prev => ({ ...prev, [blockIndex]: true }));
    try {
      const nodeUrl = NODE_URLS[selectedNode];
      const res = await fetch(`${nodeUrl}/api/v1/federated/decrypt_block/${blockIndex}`);
      if (!res.ok) throw new Error("Failed to decrypt block");
      const data = await res.json();
      setDecryptedData(prev => ({ ...prev, [blockIndex]: data.data }));
    } catch (error) {
      console.error("Failed to decrypt block:", error);
      setDecryptedData(prev => ({ ...prev, [blockIndex]: { error: "Decryption failed" } }));
    } finally {
      setDecrypting(prev => ({ ...prev, [blockIndex]: false }));
    }
  };

  const toggleBlockData = (blockIndex) => {
    if (decryptedData[blockIndex]) {
      // Hide the data
      setDecryptedData(prev => {
        const newData = { ...prev };
        delete newData[blockIndex];
        return newData;
      });
    } else {
      // Fetch and show the data
      decryptBlock(blockIndex);
    }
  };

  useEffect(() => {
    fetchChain();
    const interval = setInterval(fetchChain, 5000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Federated Blockchain Ledger</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tamper-proof audit trail for cross-border intelligence sharing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="USA">USA Node</option>
            <option value="EU">EU Node</option>
            <option value="IN">IN Node</option>
            <option value="AUS">AUS Node</option>
          </select>
          <button
            onClick={validateChain}
            disabled={loading}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {loading ? "Validating..." : "Validate Network"}
          </button>
          <button
            onClick={syncChain}
            disabled={syncing}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync Chain"}
          </button>
        </div>
      </header>

      {syncResult && (
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {syncResult.node} Node - Chain Sync Result
          </h3>
          {syncResult.error ? (
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-rose-300">Sync Failed</p>
              <p className="mt-1 text-xs text-rose-200">{syncResult.error}</p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-300">{syncResult.message}</p>
              <p className="mt-1 text-xs text-emerald-200">
                New chain length: {syncResult.new_length} blocks
              </p>
            </div>
          )}
        </section>
      )}

      {validation && (
        <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {validation.node} Node Validation
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Chain Status</p>
              <p className={`mt-1 font-semibold ${validation.valid ? "text-emerald-300" : "text-rose-300"}`}>
                {validation.valid ? "Valid ✓" : "Invalid ✗"}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Blockchain ({chain.length} blocks)
        </h3>
        <div className="mt-4 max-h-[600px] space-y-3 overflow-y-auto">
          {chain.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No blocks in chain yet.</p>
          ) : (
            chain.map((block) => (
              <article
                key={block.index}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                      {block.index}
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Block #{block.index}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                        {new Date(block.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {block.index !== 0 && (
                      <button
                        onClick={() => toggleBlockData(block.index)}
                        disabled={decrypting[block.index]}
                        className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50 transition-colors"
                      >
                        {decrypting[block.index] 
                          ? "Decrypting..." 
                          : decryptedData[block.index] 
                            ? "Hide Data" 
                            : "View Data"}
                      </button>
                    )}
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Hash</p>
                      <p className="mt-0.5 font-mono text-[10px] text-emerald-200">
                        {block.hash.substring(0, 16)}...
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Previous Hash: </span>
                    <span className="font-mono text-[10px] text-cyan-200">
                      {block.previous_hash.substring(0, 32)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Public Key: </span>
                    <span className="font-mono text-[10px] text-fuchsia-200">
                      {block.public_key.substring(0, 32)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Signature: </span>
                    <span className="font-mono text-[10px] text-amber-200">
                      {block.signature.substring(0, 32)}...
                    </span>
                  </div>
                </div>

                {/* Decrypted Data Section */}
                {decryptedData[block.index] && (
                  <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      <h4 className="text-sm font-semibold text-purple-300">Decrypted Block Data</h4>
                    </div>
                    {decryptedData[block.index].error ? (
                      <p className="text-xs text-rose-300">{decryptedData[block.index].error}</p>
                    ) : (
                      <pre className="max-h-64 overflow-auto rounded bg-slate-950/50 p-3 text-xs text-slate-300 font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(decryptedData[block.index], null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
