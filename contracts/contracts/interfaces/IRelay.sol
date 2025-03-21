// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

/// @title Interface for the Bitcoin relay
/// @notice Contains only the methods needed by tBTC v2. The Bitcoin relay
///         provides the difficulty of the previous and current epoch. One
///         difficulty epoch spans 2016 blocks.
interface IRelay {
    function genesis(bytes calldata genesisHeader, uint256 genesisHeight, uint64 genesisProofLength) external;
    function retarget(bytes memory headers) external;
    function validateChain(bytes memory headers) external view returns (uint256 startingHeaderTimestamp, uint256 headerCount);
    function getBlockDifficulty(uint256 blockNumber) external view returns (uint256);
    function getEpochDifficulty(uint256 epochNumber) external view returns (uint256);
    function getRelayRange() external view returns (uint256 relayGenesis, uint256 currentEpochEnd);
    function getCurrentEpochDifficulty() external view returns (uint256);
    function getPrevEpochDifficulty() external view returns (uint256);
    function getCurrentAndPrevEpochDifficulty() external view returns (uint256 current, uint256 previous);
}
