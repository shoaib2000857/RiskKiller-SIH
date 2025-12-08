# Multi-Node Blockchain Network - Quick Reference

## ✅ Status: RUNNING

Your 4-node federated blockchain network is now operational!

---

## Network Overview

| Node | Country | Port | URL |
|------|---------|------|-----|
| 1 | USA | 8001 | http://localhost:8001 |
| 2 | EU | 8002 | http://localhost:8002 |
| 3 | India | 8003 | http://localhost:8003 |
| 4 | Australia | 8004 | http://localhost:8004 |

**Network Status:**
- ✅ All 4 nodes running
- ✅ Blockchain synchronized across nodes
- ✅ Network consensus: VALID
- ✅ Encryption: Active (Fernet)
- ✅ Digital signatures: Ed25519

---

## Managing the Network

### Start the network
```bash
docker compose up -d
```

### Stop the network
```bash
docker compose down
```

### View logs (all nodes)
```bash
docker compose logs -f
```

### View logs (specific node)
```bash
docker compose logs -f node1
```

### Rebuild after code changes
```bash
docker compose up --build -d
```

---

## Testing the Blockchain

### 1. View blockchain (any node)
```bash
curl -s http://localhost:8001/api/v1/federated/chain | python3 -m json.tool
```

### 2. Add intelligence package (to node 1)
```bash
curl -s -X POST http://localhost:8001/api/v1/federated/add_block \
  -H "Content-Type: application/json" \
  -d '{
    "type": "threat_intel",
    "origin": "USA",
    "case_id": "INTAKE-12345",
    "risk_score": 0.87,
    "model_family": "gpt-4",
    "behavioral_risk": 0.75,
    "linguistic_score": 0.82,
    "tags": ["disinformation", "election"],
    "notes": "Coordinated inauthentic behavior detected"
  }' | python3 -m json.tool
```

### 3. Verify propagation to other nodes
```bash
# Check node 2
curl -s http://localhost:8002/api/v1/federated/chain | python3 -m json.tool

# Check node 3
curl -s http://localhost:8003/api/v1/federated/chain | python3 -m json.tool

# Check node 4
curl -s http://localhost:8004/api/v1/federated/chain | python3 -m json.tool
```

### 4. Validate network consensus
```bash
curl -s http://localhost:8001/api/v1/federated/validate | python3 -m json.tool
```

Expected response:
```json
{
  "self_valid": true,
  "nodes": {
    "http://node2:8000": true,
    "http://node3:8000": true,
    "http://node4:8000": true
  },
  "network_valid": true,
  "tampered_nodes": [],
  "chain_length": 2
}
```

### 5. Decrypt a block
```bash
curl -s http://localhost:8001/api/v1/federated/decrypt_block/1 | python3 -m json.tool
```

### 6. Validate local chain
```bash
curl -s http://localhost:8001/api/v1/federated/validate_local
```

---

## How Cross-Border Intelligence Sharing Works

1. **USA Node (8001)** detects malign content and creates intelligence package
2. Package is **encrypted** using Fernet (shared key)
3. Package is **signed** using Ed25519 private key
4. Block is added to USA's local blockchain
5. Block is **broadcast** to EU (8002), India (8003), Australia (8004)
6. Each node **validates signature** and **appends to their chain**
7. All nodes now have **tamper-proof audit trail** of the intelligence

### Privacy & Compliance

- ✅ **Data encrypted**: Raw content never leaves origin jurisdiction
- ✅ **Shared intelligence**: Only risk scores, classifications, hashes
- ✅ **Audit trail**: Every share is signed, timestamped, immutable
- ✅ **Consensus validation**: Detect tampered nodes instantly

---

## Testing Tamper Detection

### Simulate tampering (for demo purposes)

1. Add a block normally
2. Manually modify a node's database
3. Run network validation - it will show which node is tampered

```bash
# After tampering node 3's database
curl -s http://localhost:8001/api/v1/federated/validate | python3 -m json.tool
```

Expected response:
```json
{
  "self_valid": true,
  "nodes": {
    "http://node2:8000": true,
    "http://node3:8000": false,  // ❌ TAMPERED
    "http://node4:8000": true
  },
  "network_valid": false,
  "tampered_nodes": ["http://node3:8000"],
  "chain_length": 5
}
```

---

## Integration with Main App

Your main TattvaDrishti backend (port 8000) can interact with the blockchain network:

```python
import requests

# Add intelligence to federated network
def share_to_blockchain(intel_package):
    response = requests.post(
        "http://localhost:8001/api/v1/federated/add_block",
        json=intel_package
    )
    return response.json()

# Check consensus
def validate_network():
    response = requests.get(
        "http://localhost:8001/api/v1/federated/validate"
    )
    return response.json()
```

---

## Container Resources

**Memory optimization:**
- AI models are **disabled** in Docker containers (`DISABLE_AI_MODELS=true`)
- Each container uses ~200MB RAM (vs ~2GB with models loaded)
- This allows 4 nodes to run on typical laptops

**If you need AI detection in Docker:**
1. Remove `DISABLE_AI_MODELS: "true"` from docker-compose.yml
2. Increase Docker memory limit to 8GB+ in Docker Desktop settings
3. Run only 1-2 nodes instead of 4

---

## Troubleshooting

### Containers won't start
```bash
docker compose logs
```

### Out of memory
```bash
# Check Docker memory allocation
docker stats

# Increase in Docker Desktop → Settings → Resources → Memory
```

### Port already in use
```bash
# Stop existing services
docker compose down

# Or change ports in docker-compose.yml
```

### Database locked
```bash
# Stop all containers
docker compose down

# Remove data volumes
rm -rf data/node*/

# Restart
docker compose up -d
```

---

## Production Considerations

For real deployment:

1. **Use separate encryption keys** for each jurisdiction
2. **Configure TLS/HTTPS** for node communication
3. **Set up authentication** (API keys, OAuth)
4. **Use persistent volumes** (not local ./data/)
5. **Deploy on cloud** (AWS, GCP, Azure) with proper networking
6. **Enable monitoring** (Prometheus, Grafana)
7. **Set up log aggregation** (ELK stack)

---

## Summary

You now have a **fully functional 4-node federated blockchain** for cross-border intelligence sharing:

✅ Encrypted data
✅ Digital signatures  
✅ Tamper-evident audit trail
✅ Network consensus validation
✅ Privacy-preserving (only share risk scores, not raw content)
✅ Compliant with data localization laws

**Use Case:** Allied nations (USA, EU, India, Australia) can securely share threat intelligence about AI-generated disinformation without violating privacy regulations.
