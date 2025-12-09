"use client";

import { useEffect, useState, useRef } from "react";

const NODE_URLS = {
  USA: "http://localhost:8001",
  EU: "http://localhost:8002",
  IN: "http://localhost:8003",
  AUS: "http://localhost:8004",
};

export default function BlockchainGraph() {
  const [chains, setChains] = useState({
    USA: [],
    EU: [],
    IN: [],
    AUS: [],
  });
  const [genesisBlock, setGenesisBlock] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const fetchChainData = async () => {
    try {
      // Fetch main chain to get genesis block
      const mainRes = await fetch("http://localhost:8000/api/v1/federated/chain");
      const mainData = await mainRes.json();
      if (mainData.chain && mainData.chain.length > 0) {
        setGenesisBlock(mainData.chain[0]);
      }

      // Fetch chains from all nodes in parallel
      const chainPromises = Object.entries(NODE_URLS).map(async ([name, url]) => {
        try {
          const res = await fetch(`${url}/api/v1/federated/chain`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) {
            console.warn(`${name} node returned status ${res.status}`);
            return [name, []];
          }
          const data = await res.json();
          return [name, data.chain || []];
        } catch (error) {
          console.error(`Failed to fetch ${name} chain:`, error);
          return [name, []];
        }
      });

      const results = await Promise.all(chainPromises);
      const newChains = Object.fromEntries(results);
      
      setChains(newChains);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch blockchain data:", error);
    }
  };

  useEffect(() => {
    fetchChainData();
    const interval = setInterval(fetchChainData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawGraph();
  }, [chains, genesisBlock, scrollOffset]);

  // Calculate required canvas height based on max blocks
  const getCanvasHeight = () => {
    const maxBlocks = Math.max(
      ...Object.values(chains).map(chain => chain.filter(b => b.index > 0).length)
    );
    const blockStartY = 300;
    const blockSpacing = 120;
    const minHeight = 650;
    const calculatedHeight = blockStartY + (maxBlocks * blockSpacing) + 100;
    return Math.max(minHeight, calculatedHeight);
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = getCanvasHeight();
    
    // Update canvas height if needed
    if (canvas.height !== height) {
      canvas.height = height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Styling constants
    const genesisY = 60;
    const nodeY = 180;
    const blockStartY = 300;
    const blockHeight = 60;
    const blockWidth = 100;
    const blockSpacing = 120;
    const nodeWidth = 140;
    const nodeHeight = 80;

    // Draw Genesis Block
    if (genesisBlock) {
      const genesisX = width / 2 - 70;
      
      // Genesis node box with glow effect
      ctx.shadowBlur = 20;
      ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.fillRect(genesisX, genesisY - 40, 140, 70);
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = "rgba(16, 185, 129, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(genesisX, genesisY - 40, 140, 70);
      
      // Genesis text
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GENESIS NODE", genesisX + 70, genesisY - 15);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#6ee7b7";
      ctx.fillText(`Block #${genesisBlock.index}`, genesisX + 70, genesisY + 5);
      ctx.fillText(genesisBlock.hash.substring(0, 12) + "...", genesisX + 70, genesisY + 20);
    }

    // Draw Federated Nodes
    const nodeNames = ["USA", "EU", "IN", "AUS"];
    const nodePositions = {};
    const nodeSpacing = width / (nodeNames.length + 1);

    nodeNames.forEach((name, index) => {
      const x = nodeSpacing * (index + 1) - nodeWidth / 2;
      nodePositions[name] = { x, y: nodeY };

      // Node box with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      ctx.fillRect(x, nodeY, nodeWidth, nodeHeight);
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, nodeY, nodeWidth, nodeHeight);

      // Node label
      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(name, x + nodeWidth / 2, nodeY + 30);
      
      // Block count
      const blockCount = chains[name]?.filter(b => b.index > 0).length || 0;
      ctx.font = "11px monospace";
      ctx.fillStyle = "#93c5fd";
      ctx.fillText(`${blockCount} blocks`, x + nodeWidth / 2, nodeY + 50);

      // Draw line from genesis to node
      if (genesisBlock) {
        ctx.strokeStyle = "rgba(100, 200, 150, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, genesisY + 30);
        const controlY = (genesisY + 30 + nodeY) / 2;
        ctx.quadraticCurveTo(width / 2, controlY, x + nodeWidth / 2, nodeY);
        ctx.stroke();
        
        // Arrow at node
        ctx.fillStyle = "rgba(100, 200, 150, 0.5)";
        ctx.beginPath();
        ctx.moveTo(x + nodeWidth / 2, nodeY);
        ctx.lineTo(x + nodeWidth / 2 - 5, nodeY - 8);
        ctx.lineTo(x + nodeWidth / 2 + 5, nodeY - 8);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw ALL Blocks for each node (excluding genesis)
    nodeNames.forEach((name) => {
      const blocks = chains[name] || [];
      const nodePos = nodePositions[name];
      
      // Filter out genesis block and show ALL remaining blocks
      const displayBlocks = blocks.filter(block => block.index > 0);
      
      displayBlocks.forEach((block, idx) => {
        const blockX = nodePos.x + nodeWidth / 2 - blockWidth / 2;
        const blockY = blockStartY + (idx * blockSpacing);

        // Draw line connecting blocks
        ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (idx === 0) {
          // First block - line from node
          ctx.moveTo(nodePos.x + nodeWidth / 2, nodePos.y + nodeHeight);
          ctx.lineTo(blockX + blockWidth / 2, blockY);
        } else {
          // Subsequent blocks - line from previous block
          const prevBlockY = blockStartY + ((idx - 1) * blockSpacing) + blockHeight;
          ctx.moveTo(blockX + blockWidth / 2, prevBlockY);
          ctx.lineTo(blockX + blockWidth / 2, blockY);
        }
        ctx.stroke();

        // Arrow
        ctx.fillStyle = "rgba(139, 92, 246, 0.5)";
        ctx.beginPath();
        ctx.moveTo(blockX + blockWidth / 2, blockY);
        ctx.lineTo(blockX + blockWidth / 2 - 4, blockY - 6);
        ctx.lineTo(blockX + blockWidth / 2 + 4, blockY - 6);
        ctx.closePath();
        ctx.fill();

        // Block box with glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
        ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
        ctx.fillRect(blockX, blockY, blockWidth, blockHeight);
        ctx.shadowBlur = 0;
        
        ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(blockX, blockY, blockWidth, blockHeight);

        // Block info
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Block #${block.index}`, blockX + blockWidth / 2, blockY + 20);
        
        ctx.font = "9px monospace";
        ctx.fillStyle = "#e9d5ff";
        ctx.fillText(block.hash.substring(0, 8) + "...", blockX + blockWidth / 2, blockY + 35);
        
        const time = new Date(block.timestamp * 1000);
        ctx.fillText(time.toLocaleTimeString(), blockX + blockWidth / 2, blockY + 48);
      });
    });
  };

  const totalBlocks = Object.values(chains).reduce(
    (sum, chain) => sum + chain.filter(b => b.index > 0).length, 
    0
  );

  const handleScroll = (e) => {
    setScrollOffset(e.target.scrollTop);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Federated Network Topology</h3>
          <p className="mt-1 text-sm text-slate-400">
            Real-time visualization of distributed blockchain architecture
            {lastUpdate && (
              <span className="ml-2 text-xs text-slate-500">
                • Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
            <span className="text-sm font-semibold text-purple-300">{totalBlocks} Total Blocks</span>
          </div>
          <div className="flex gap-2 text-xs">
            {Object.entries(chains).map(([name, chain]) => (
              <span key={name} className="text-slate-500">
                {name}: <span className="font-mono text-slate-400">{chain.filter(b => b.index > 0).length}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative overflow-auto rounded-xl border border-white/10 bg-slate-900/40"
        style={{ maxHeight: "650px" }}
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          width={1200}
          height={getCanvasHeight()}
          className="w-full"
          style={{ background: "rgba(15, 23, 42, 0.5)" }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-emerald-500/50 bg-emerald-500/15" />
          <span className="text-slate-400">Genesis Node</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-blue-500/50 bg-blue-500/15" />
          <span className="text-slate-400">Federated Nodes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-purple-500/50 bg-purple-500/15" />
          <span className="text-slate-400">Blockchain Blocks</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="h-3 w-8" viewBox="0 0 40 12">
            <path d="M 2 6 Q 20 2, 38 6" stroke="rgba(100, 200, 150, 0.5)" strokeWidth="2" fill="none" />
            <polygon points="38,6 35,4 35,8" fill="rgba(100, 200, 150, 0.5)" />
          </svg>
          <span className="text-slate-400">Data Flow</span>
        </div>
      </div>

      {totalBlocks > 12 && (
        <div className="mt-3 text-center text-xs text-slate-500">
          Scroll down to view all {totalBlocks} blocks
        </div>
      )}
    </div>
  );
}