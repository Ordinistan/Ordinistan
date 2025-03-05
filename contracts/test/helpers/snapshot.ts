import { ethers } from "hardhat";

// Store multiple snapshots with IDs
const snapshots: string[] = [];

/**
 * Creates a snapshot of the current blockchain state
 * @returns The snapshot ID
 */
export async function createSnapshot(): Promise<void> {
  const id = await ethers.provider.send("evm_snapshot", []);
  snapshots.push(id);
}

/**
 * Restores the blockchain state to a previous snapshot
 */
export async function restoreSnapshot(): Promise<void> {
  if (snapshots.length === 0) {
    throw new Error("No snapshots to restore");
  }
  
  const id = snapshots.pop();
  await ethers.provider.send("evm_revert", [id]);
}

export default {
  createSnapshot,
  restoreSnapshot
};