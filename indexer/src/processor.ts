import {EvmBatchProcessor, EvmBatchProcessorFields, BlockHeader, Log as _Log, Transaction as _Transaction} from '@subsquid/evm-processor'
import * as lightRelayAbi from './abi/lightRelay'
import * as marketplaceAbi from './abi/marketplace'

export const processor = new EvmBatchProcessor()
    /// Datalake with historical data for the network
    /// @link https://docs.subsquid.io/subsquid-network/reference/evm-networks/
    // .setGateway('core-mainnet')
    /// RPC endpoint to fetch latest blocks.
    /// Set RPC_URL environment variable, or specify ChainRpc endpoint
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/general/#set-rpc-endpoint
    .setRpcEndpoint(process.env.RPC_ENDPOINT)

    /// Set a starting block (adjust as needed)
    .setBlockRange({ from: 1 })

    /// Add this line to specify finality confirmation
    .setFinalityConfirmation(10) // Adjust this number based on Core DAO's finality requirements

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
    /// Subscribe to events emitted by lightRelay
    .addLog({
        /// lightRelay address
        address: ['0x0000000000000000000000000000000000000000'],
        /// Topic0 of subscribed events
        /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/field-selection/#set-fields
        topic0: [
            lightRelayAbi.events['AuthorizationRequirementChanged'].topic,
            lightRelayAbi.events['Genesis'].topic,
            lightRelayAbi.events['OwnershipTransferred'].topic,
            lightRelayAbi.events['ProofLengthChanged'].topic,
            lightRelayAbi.events['Retarget'].topic,
            lightRelayAbi.events['SubmitterAuthorized'].topic,
            lightRelayAbi.events['SubmitterDeauthorized'].topic,
        ],
    })
    /// Subscribe to events emitted by marketplace
    .addLog({
        /// marketplace address
        address: ['0x0000000000000000000000000000000000000000'],
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
    })
    /// Uncomment this to specify the number of blocks after which the processor will consider the consensus data final
    /// @link https://docs.subsquid.io/sdk/reference/processors/evm-batch/general/#set-finality-confirmation
    // .setFinalityConfirmation(1000)


export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
