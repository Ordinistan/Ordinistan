import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  AddNFTSupport as AddNFTSupportEvent,
  AddTokenSupport as AddTokenSupportEvent,
  AdminChanged as AdminChangedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  BidAccepted as BidAcceptedEvent,
  BidPlaced as BidPlacedEvent,
  BidRejected as BidRejectedEvent,
  BidWithdraw as BidWithdrawEvent,
  ContractUpgraded as ContractUpgradedEvent,
  FeeClaimed as FeeClaimedEvent,
  Initialized as InitializedEvent,
  OrderCancelled as OrderCancelledEvent,
  OrderCreated as OrderCreatedEvent,
  OrderPurchased as OrderPurchasedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  Upgraded as UpgradedEvent
} from "../generated/Marketplace/Marketplace"
import {
  AddNFTSupport,
  AddTokenSupport,
  AdminChanged,
  BeaconUpgraded,
  BidAccepted,
  BidPlaced,
  BidRejected,
  BidWithdraw,
  ContractUpgraded,
  FeeClaimed,
  Initialized,
  OrderCancelled,
  OrderCreated,
  OrderPurchased,
  OwnershipTransferred,
  Upgraded
} from "../generated/schema"

export function handleAddNFTSupport(event: AddNFTSupportEvent): void {
  let entity = new AddNFTSupport(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.nftAddress = event.params.nftAddress
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleAddTokenSupport(event: AddTokenSupportEvent): void {
  let entity = new AddTokenSupport(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenAddress = event.params.tokenAddress
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleAdminChanged(event: AdminChangedEvent): void {
  let entity = new AdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousAdmin = event.params.previousAdmin
  entity.newAdmin = event.params.newAdmin
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let entity = new BeaconUpgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.beacon = event.params.beacon
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleBidAccepted(event: BidAcceptedEvent): void {
  let entity = new BidAccepted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  entity.bidId = Bytes.fromI32(event.params.bidId.toI32())
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleBidPlaced(event: BidPlacedEvent): void {
  let entity = new BidPlaced(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  entity.bidder = event.params.bidder
  entity.copies = BigInt.fromI32(event.params.copies)
  entity.pricePerNFT = event.params.pricePerNFT
  entity.startTime = event.params.startTime
  entity.endTime = event.params.endTime
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleBidRejected(event: BidRejectedEvent): void {
  let entity = new BidRejected(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  entity.bidId = Bytes.fromI32(event.params.bidId.toI32())
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleBidWithdraw(event: BidWithdrawEvent): void {
  let entity = new BidWithdraw(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleContractUpgraded(event: ContractUpgradedEvent): void {
  let entity = new ContractUpgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.oldImplementation = event.params.oldImplementation
  entity.newImplementation = event.params.newImplementation
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleFeeClaimed(event: FeeClaimedEvent): void {
  let entity = new FeeClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenAddress = event.params.tokenAddress
  entity.to = event.params.to
  entity.amount = event.params.amount
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = BigInt.fromI32(event.params.version)
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleOrderCancelled(event: OrderCancelledEvent): void {
  let entity = new OrderCancelled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleOrderCreated(event: OrderCreatedEvent): void {
  let entity = new OrderCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.seller = event.params.seller
  entity.tokenId = event.params.tokenId
  entity.pricePerNFT = event.params.pricePerNFT
  entity.copies = BigInt.fromI32(event.params.copies)
  entity.startTime = event.params.startTime
  entity.endTime = event.params.endTime
  entity.paymentToken = event.params.paymentToken
  entity.nftContract = event.params.nftContract
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleOrderPurchased(event: OrderPurchasedEvent): void {
  let entity = new OrderPurchased(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.orderId = Bytes.fromI32(event.params.orderId.toI32())
  entity.buyer = event.params.buyer
  entity.copies = BigInt.fromI32(event.params.copies)
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
}

export function handleUpgraded(event: UpgradedEvent): void {
  let entity = new Upgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.implementation = event.params.implementation
  
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  
  entity.save()
} 