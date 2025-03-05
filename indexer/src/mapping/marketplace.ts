import {DataHandlerContext} from '@subsquid/evm-processor'
import {Store} from '../db'
import {functions, events} from '../abi/marketplace'
import * as eventHandlers from '../handlers/marketplace_events'
import * as functionHandlers from '../handlers/marketplace_functions'
import {Log, Transaction} from '../processor'

const address = '0x0000000000000000000000000000000000000000'


export function parseEvent(ctx: DataHandlerContext<Store>, log: Log) {
    try {
        if (events['AddNFTSupport'].is(log)) {
            return eventHandlers.handleAddNftSupportEvent(ctx, log)
        }
        if (events['AddTokenSupport'].is(log)) {
            return eventHandlers.handleAddTokenSupportEvent(ctx, log)
        }
        if (events['AdminChanged'].is(log)) {
            return eventHandlers.handleAdminChangedEvent(ctx, log)
        }
        if (events['BeaconUpgraded'].is(log)) {
            return eventHandlers.handleBeaconUpgradedEvent(ctx, log)
        }
        if (events['BidAccepted'].is(log)) {
            return eventHandlers.handleBidAcceptedEvent(ctx, log)
        }
        if (events['BidPlaced'].is(log)) {
            return eventHandlers.handleBidPlacedEvent(ctx, log)
        }
        if (events['BidRejected'].is(log)) {
            return eventHandlers.handleBidRejectedEvent(ctx, log)
        }
        if (events['BidWithdraw'].is(log)) {
            return eventHandlers.handleBidWithdrawEvent(ctx, log)
        }
        if (events['ContractUpgraded'].is(log)) {
            return eventHandlers.handleContractUpgradedEvent(ctx, log)
        }
        if (events['FeeClaimed'].is(log)) {
            return eventHandlers.handleFeeClaimedEvent(ctx, log)
        }
        if (events['Initialized'].is(log)) {
            return eventHandlers.handleInitializedEvent(ctx, log)
        }
        if (events['OrderCancelled'].is(log)) {
            return eventHandlers.handleOrderCancelledEvent(ctx, log)
        }
        if (events['OrderCreated'].is(log)) {
            return eventHandlers.handleOrderCreatedEvent(ctx, log)
        }
        if (events['OrderPurchased'].is(log)) {
            return eventHandlers.handleOrderPurchasedEvent(ctx, log)
        }
        if (events['OwnershipTransferred'].is(log)) {
            return eventHandlers.handleOwnershipTransferredEvent(ctx, log)
        }
        if (events['Upgraded'].is(log)) {
            return eventHandlers.handleUpgradedEvent(ctx, log)
        }
    }
    catch (error) {
        ctx.log.error({error, blockNumber: log.block.height, blockHash: log.block.hash, address}, `Unable to decode event "${log.topics[0]}"`)
    }
}

export function parseFunction(ctx: DataHandlerContext<Store>, transaction: Transaction) {
    try {
    }
    catch (error) {
        ctx.log.error({error, blockNumber: transaction.block.height, blockHash: transaction.block.hash, address}, `Unable to decode function "${transaction.input.slice(0, 10)}"`)
    }
}
