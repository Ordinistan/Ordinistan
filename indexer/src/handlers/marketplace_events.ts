import type {DataHandlerContext} from '@subsquid/evm-processor'
import type {Store} from '../db'
import {events} from '../abi/marketplace'
import {EntityBuffer} from '../entityBuffer'
import {MarketplaceEventAddNftSupport, MarketplaceEventAddTokenSupport, MarketplaceEventAdminChanged, MarketplaceEventBeaconUpgraded, MarketplaceEventBidAccepted, MarketplaceEventBidPlaced, MarketplaceEventBidRejected, MarketplaceEventBidWithdraw, MarketplaceEventContractUpgraded, MarketplaceEventFeeClaimed, MarketplaceEventInitialized, MarketplaceEventOrderCancelled, MarketplaceEventOrderCreated, MarketplaceEventOrderPurchased, MarketplaceEventOwnershipTransferred, MarketplaceEventUpgraded} from '../model'
import {Log} from '../processor'

export function handleAddNftSupportEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['AddNFTSupport'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventAddNftSupport({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'AddNFTSupport',
            nftAddress: e.nftAddress,
        })
    )
}
export function handleAddTokenSupportEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['AddTokenSupport'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventAddTokenSupport({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'AddTokenSupport',
            tokenAddress: e.tokenAddress,
        })
    )
}
export function handleAdminChangedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['AdminChanged'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventAdminChanged({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'AdminChanged',
            previousAdmin: e.previousAdmin,
            newAdmin: e.newAdmin,
        })
    )
}
export function handleBeaconUpgradedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['BeaconUpgraded'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventBeaconUpgraded({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'BeaconUpgraded',
            beacon: e.beacon,
        })
    )
}
export function handleBidAcceptedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['BidAccepted'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventBidAccepted({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'BidAccepted',
            orderId: e.orderId,
            bidId: e.bidId,
            copies: BigInt(e.copies),
        })
    )
}
export function handleBidPlacedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['BidPlaced'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventBidPlaced({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'BidPlaced',
            orderId: e.orderId,
            bidIndex: e.bidIndex,
            bidder: e.bidder,
            copies: BigInt(e.copies),
            pricePerNft: e.pricePerNFT,
            startTime: e.startTime,
            endTime: e.endTime,
        })
    )
}
export function handleBidRejectedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['BidRejected'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventBidRejected({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'BidRejected',
            orderId: e.orderId,
            bidId: e.bidId,
        })
    )
}
export function handleBidWithdrawEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['BidWithdraw'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventBidWithdraw({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'BidWithdraw',
            orderId: e.orderId,
            bidId: e.bidId,
        })
    )
}
export function handleContractUpgradedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['ContractUpgraded'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventContractUpgraded({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'ContractUpgraded',
            oldImplementation: e.oldImplementation,
            newImplementation: e.newImplementation,
        })
    )
}
export function handleFeeClaimedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['FeeClaimed'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventFeeClaimed({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'FeeClaimed',
            tokenAddress: e.tokenAddress,
            to: e.to,
            amount: e.amount,
        })
    )
}
export function handleInitializedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Initialized'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventInitialized({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'Initialized',
            version: BigInt(e.version),
        })
    )
}
export function handleOrderCancelledEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OrderCancelled'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventOrderCancelled({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'OrderCancelled',
            orderId: e.orderId,
        })
    )
}
export function handleOrderCreatedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OrderCreated'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventOrderCreated({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'OrderCreated',
            orderId: e.orderId,
            tokenId: e.tokenId,
            pricePerNft: e.pricePerNFT,
            seller: e.seller,
            copies: BigInt(e.copies),
            startTime: e.startTime,
            endTime: e.endTime,
            paymentToken: e.paymentToken,
            nftContract: e.nftContract,
        })
    )
}
export function handleOrderPurchasedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OrderPurchased'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventOrderPurchased({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'OrderPurchased',
            orderId: e.orderId,
            buyer: e.buyer,
            copies: BigInt(e.copies),
        })
    )
}
export function handleOwnershipTransferredEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OwnershipTransferred'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventOwnershipTransferred({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'OwnershipTransferred',
            previousOwner: e.previousOwner,
            newOwner: e.newOwner,
        })
    )
}
export function handleUpgradedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Upgraded'].decode(log)
    EntityBuffer.add(
        new MarketplaceEventUpgraded({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'Upgraded',
            implementation: e.implementation,
        })
    )
}
