import { BigNumber } from "@ethersproject/bignumber"
import { ethers } from "hardhat"

// TODO: It is deprecated and `to1ePrecision` from the
// https://github.com/keep-network/hardhat-helpers/blob/main/src/number.ts should
// be used instead.
export function to1ePrecision(n: number, precision: number): BigNumber {
  const decimalMultiplier = ethers.BigNumber.from(10).pow(precision)
  return ethers.BigNumber.from(n).mul(decimalMultiplier)
}

export function to1e18(n: number): BigNumber {
  const decimalMultiplier = ethers.BigNumber.from(10).pow(18)
  return ethers.BigNumber.from(n).mul(decimalMultiplier)
}

export function toSatoshis(amountInBtc: number): BigNumber {
  return to1ePrecision(amountInBtc, 8)
}

export async function getBlockTime(blockNumber: number): Promise<number> {
  return (await ethers.provider.getBlock(blockNumber)).timestamp
}

export function strip0xPrefix(hexString: string): string {
  return hexString.substring(0, 2) === "0x" ? hexString.substring(2) : hexString
}

/**
 * Concatenates an array of hex strings into a single hex string.
 * @param hexStrings Array of hex strings to concatenate
 * @returns A single concatenated hex string
 */
export function concatenateHexStrings(hexStrings: string[]): string {
  // Remove '0x' prefix from all strings except the first one
  const firstHex = hexStrings[0];
  const restHex = hexStrings.slice(1).map(hex => hex.startsWith('0x') ? hex.slice(2) : hex);
  
  // Concatenate all strings
  return firstHex + restHex.join('');
}
