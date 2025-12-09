"""
Manages the blockchain state and validation logic.
"""
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import List

from ..config import get_settings
from .crypto import sha256, verify_signature
from .ledger import Block


class LedgerManager:
    def __init__(self):
        settings = get_settings()
        # For blockchain nodes, always store the ledger in ./data/federated_ledger.db
        self.ledger_db_path = "data/federated_ledger.db"
        self._initialise()

    @contextmanager
    def _cursor(self):
        conn = sqlite3.connect(self.ledger_db_path)
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()

    def _initialise(self):
        with self._cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS blocks (
                    idx INTEGER PRIMARY KEY,
                    ts REAL,
                    data_encrypted TEXT,
                    previous_hash TEXT,
                    hash TEXT,
                    signature TEXT,
                    public_key TEXT
                )
            """
            )
            cur.execute("SELECT idx FROM blocks WHERE idx=0")
            if cur.fetchone() is None:
                genesis = Block(
                    index=0,
                    timestamp=0.0,
                    data_encrypted="GENESIS_BLOCK_V1.0",
                    previous_hash="0" * 64,
                    public_key="GENESIS_KEY",
                    signature="GENESIS_SIGNATURE",
                    hash="",
                )
                genesis.hash = sha256(genesis.payload())
                self.save_block(genesis)

    def get_chain(self) -> List[Block]:
        with self._cursor() as cur:
            rows = cur.execute("SELECT * FROM blocks ORDER BY idx").fetchall()
            return [
                Block(
                    index=r[0],
                    timestamp=r[1],
                    data_encrypted=r[2],
                    previous_hash=r[3],
                    hash=r[4],
                    signature=r[5],
                    public_key=r[6],
                )
                for r in rows
            ]

    def get_latest_block(self) -> Block:
        return self.get_chain()[-1]

    def save_block(self, block: Block):
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO blocks (idx, ts, data_encrypted, previous_hash, hash, signature, public_key)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    block.index,
                    block.timestamp,
                    block.data_encrypted,
                    block.previous_hash,
                    block.hash,
                    block.signature,
                    block.public_key,
                ),
            )

    def validate_chain(self, chain: List[Block]) -> bool:
        for i in range(1, len(chain)):
            current = chain[i]
            previous = chain[i - 1]

            if current.previous_hash != previous.hash:
                return False
            if current.hash != sha256(current.payload()):
                return False
            if not verify_signature(current.public_key, current.payload(), current.signature):
                return False
        return True

    def validate_block(self, block: Block, previous_block: Block) -> bool:
        if block.index != previous_block.index + 1:
            return False
        if block.previous_hash != previous_block.hash:
            return False
        if block.hash != sha256(block.payload()):
            return False
        if not verify_signature(block.public_key, block.payload(), block.signature):
            return False
        return True

    def reset_chain(self):
        """Reset the blockchain to only the genesis block."""
        with self._cursor() as cur:
            # Delete all blocks except genesis (index 0)
            cur.execute("DELETE FROM blocks WHERE idx > 0")

    def reset_chain(self):
        """Delete all blocks and reinitialize with genesis block only."""
        with self._cursor() as cur:
            cur.execute("DELETE FROM blocks")
            # Recreate genesis block
            genesis = Block(
                index=0,
                timestamp=0.0,
                data_encrypted="GENESIS_BLOCK_V1.0",
                previous_hash="0" * 64,
                public_key="GENESIS_KEY",
                signature="GENESIS_SIGNATURE",
                hash="",
            )
            genesis.hash = sha256(genesis.payload())
            cur.execute(
                """
                INSERT INTO blocks (idx, ts, data_encrypted, previous_hash, hash, signature, public_key)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    genesis.index,
                    genesis.timestamp,
                    genesis.data_encrypted,
                    genesis.previous_hash,
                    genesis.hash,
                    genesis.signature,
                    genesis.public_key,
                ),
            )
