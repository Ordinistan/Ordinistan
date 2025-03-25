import {EvmBatchProcessor, EvmBatchProcessorFields, BlockHeader, Log as _Log, Transaction as _Transaction} from '@subsquid/evm-processor'
import * as bridgeAbi from './abi/bridge'
import * as marketplaceAbi from './abi/marketplace'


// Verify these are the correct mainnet addresses
// const bridgeAddress = ('0xAA6005D95b61876E1B66191e9db39a66aceD3fa7').toLowerCase()
// const marketplaceAddress = ('0x5405b0E3851f99699c1E5C092F50BAfdAe770a0b').toLowerCase()



const bridgeAddress = ('0x13748584Ea70ddd16273aF9a4797836d9eb7e7AA').toLowerCase()
const marketplaceAddress = ('0x5EAFc51b0d71C2d3DE27b3b1b151f5178Fe80111').toLowerCase()

console.log('Starting indexer with following contract addresses:')
console.log('Bridge contract:', bridgeAddress)
console.log('Marketplace contract:', marketplaceAddress)

// Start from a more recent block to improve catching up (current block - 5000)
// const startFromBlock = 23196137

const startFromBlock = 7947684


export const processor = new EvmBatchProcessor()
    /// Datalake with historical data for the network
    /// @link https://docs.subsquid.io/subsquid-network/reference/evm-networks/
    /// RPC endpoint to fetch latest blocks.
    /// Set RPC_URL environment variable, or specify ChainRpc endpoint
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/general/#set-rpc-endpoint
    // .setRpcEndpoint("https://core.public.infstones.com")
    .setRpcEndpoint("https://eth-sepolia.g.alchemy.com/v2/Hp5Za9Qlo3bRwT6zxRWtwzVoGq7Uqe8s")
    /// Reduce finality confirmation to catch blocks faster
    .setFinalityConfirmation(10)
    /// Specify which type of data needs to be extracted from the block
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/field-selection/#set-fields
    .setFields({
            log: {
                topics: true,
                data: true,
                transactionHash: true,
            },
            transaction: {
                hash: true,
                input: true,
                from: true,
                value: true,
                status: true,
        }
    })
    /// Subscribe to events emitted by bridge
    .addLog({
        /// bridge address
        address: [bridgeAddress],
        /// Topic0 of subscribed events
        /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/field-selection/#set-fields
        topic0: [
            bridgeAbi.events['Approval'].topic,
            bridgeAbi.events['ApprovalForAll'].topic,
            bridgeAbi.events['OrdinalBridged'].topic,
            bridgeAbi.events['OwnershipTransferred'].topic,
            bridgeAbi.events['Transfer'].topic,
        ],
        /// Scanned blocks range
        range: {
            from: startFromBlock,
        },
    })
    /// Subscribe to events emitted by marketplace
    .addLog({
        /// marketplace address
        address: [marketplaceAddress],
        /// Topic0 of subscribed events
        /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/field-selection/#set-fields
        topic0: [
            marketplaceAbi.events['AddNFTSupport'].topic,
            marketplaceAbi.events['AddTokenSupport'].topic,
            marketplaceAbi.events['AdminChanged'].topic,
            marketplaceAbi.events['BeaconUpgraded'].topic,
            marketplaceAbi.events['BidAccepted'].topic,
            marketplaceAbi.events['BidPlaced'].topic,
            marketplaceAbi.events['BidRejected'].topic,
            marketplaceAbi.events['BidWithdraw'].topic,
            marketplaceAbi.events['ContractUpgraded'].topic,
            marketplaceAbi.events['FeeClaimed'].topic,
            marketplaceAbi.events['Initialized'].topic,
            marketplaceAbi.events['OrderCancelled'].topic,
            marketplaceAbi.events['OrderCreated'].topic,
            marketplaceAbi.events['OrderPurchased'].topic,
            marketplaceAbi.events['OwnershipTransferred'].topic,
            marketplaceAbi.events['Upgraded'].topic,
        ],
        /// Scanned blocks range
        range: {
            from: startFromBlock,
        },
    })

console.log(`Indexer configured to start from block ${startFromBlock}`)

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
