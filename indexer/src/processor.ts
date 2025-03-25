import {EvmBatchProcessor, EvmBatchProcessorFields, BlockHeader, Log as _Log, Transaction as _Transaction} from '@subsquid/evm-processor'
import * as bridgeAbi from './abi/bridge'
import * as marketplaceAbi from './abi/marketplace'

console.log("RPC_URL", process.env.RPC_URL)
export const processor = new EvmBatchProcessor()
    /// Datalake with historical data for the network
    /// @link https://docs.subsquid.io/subsquid-network/reference/evm-networks/
    /// RPC endpoint to fetch latest blocks.
    /// Set RPC_URL environment variable, or specify ChainRpc endpoint
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/general/#set-rpc-endpoint
    .setRpcEndpoint("https://rpc.coredao.org")
    .setFinalityConfirmation(75)
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
        address: ['0xAA6005D95b61876E1B66191e9db39a66aceD3fa7'.toLowerCase()],
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
            from: 23196137,
        },
    })
    /// Subscribe to events emitted by marketplace
    .addLog({
        /// marketplace address
        address: ['0x5405b0E3851f99699c1E5C092F50BAfdAe770a0b'.toLowerCase()],
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
            from: 23196137,
        },
    })
    /// Uncomment this to specify the number of blocks after which the processor will consider the consensus data final
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/general/#set-finality-confirmation
    // .setFinalityConfirmation(1000)


export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
