import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    AddNFTSupport: event("0xc17ab2816a2d2b38ee22bdddaf48e61dd871e03f7c2cf52cac2496aa59fbb20a", "AddNFTSupport(address)", {"nftAddress": indexed(p.address)}),
    AddTokenSupport: event("0x2271c88f8d9ab9ec105918932baf4eb839c0c33ef243d3f86424c8702a3ba070", "AddTokenSupport(address)", {"tokenAddress": indexed(p.address)}),
    AdminChanged: event("0x7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f", "AdminChanged(address,address)", {"previousAdmin": p.address, "newAdmin": p.address}),
    BeaconUpgraded: event("0x1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e", "BeaconUpgraded(address)", {"beacon": indexed(p.address)}),
    BidAccepted: event("0x7a73c3bdd15d1f1c81ca94b8fb48156cfa4fde7207172fe1ef057b88ecc70373", "BidAccepted(uint256,uint256,uint16)", {"orderId": indexed(p.uint256), "bidId": p.uint256, "copies": p.uint16}),
    BidPlaced: event("0xf59c7179ce053eb17b4dd744eefca7ea301b9c6c2f9814cb89e2aea376241032", "BidPlaced(uint256,uint256,address,uint16,uint256,uint256,uint256)", {"orderId": indexed(p.uint256), "bidIndex": p.uint256, "bidder": p.address, "copies": p.uint16, "pricePerNFT": p.uint256, "startTime": p.uint256, "endTime": p.uint256}),
    BidRejected: event("0x862482fca0f1c4dde27614ebf8dceca2174aae3f4f5a9ee8d09aaf6aa8177f3f", "BidRejected(uint256,uint256)", {"orderId": indexed(p.uint256), "bidId": p.uint256}),
    BidWithdraw: event("0x5a993d07c9201d97ef6e60c13ca29c90f6c59a79f7b01a902db32551a28b29b9", "BidWithdraw(uint256,uint256)", {"orderId": indexed(p.uint256), "bidId": p.uint256}),
    ContractUpgraded: event("0x2e4cc16c100f0b55e2df82ab0b1a7e294aa9cbd01b48fbaf622683fbc0507a49", "ContractUpgraded(address,address)", {"oldImplementation": indexed(p.address), "newImplementation": indexed(p.address)}),
    FeeClaimed: event("0x4a34429a0ef883c4301d5b40aa8ae85d4eb024946062f2c7ebd8320acedc831a", "FeeClaimed(address,address,uint256)", {"tokenAddress": indexed(p.address), "to": p.address, "amount": p.uint256}),
    Initialized: event("0x7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb3847402498", "Initialized(uint8)", {"version": p.uint8}),
    OrderCancelled: event("0x61b9399f2f0f32ca39ce8d7be32caed5ec22fe07a6daba3a467ed479ec606582", "OrderCancelled(uint256)", {"orderId": indexed(p.uint256)}),
    OrderCreated: event("0xaf01c77eb3607dfb4793bab461fc8ff2299939ac9b864acd3dc801505bedee1b", "OrderCreated(uint256,uint256,uint256,address,uint16,uint256,uint256,address,address)", {"orderId": indexed(p.uint256), "tokenId": indexed(p.uint256), "pricePerNFT": p.uint256, "seller": p.address, "copies": p.uint16, "startTime": p.uint256, "endTime": p.uint256, "paymentToken": p.address, "nftContract": p.address}),
    OrderPurchased: event("0xdb622478ff344d543338a892a6794926bf6113f347037c2eaf4bf0ac50f71839", "OrderPurchased(uint256,address,uint16)", {"orderId": indexed(p.uint256), "buyer": p.address, "copies": p.uint16}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    Upgraded: event("0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b", "Upgraded(address)", {"implementation": indexed(p.address)}),
}

export const functions = {
    acceptBid: fun("0x02e9d5e4", "acceptBid(uint256,uint256)", {"orderId": p.uint256, "bidId": p.uint256}, ),
    addNftContractSupport: fun("0x4266aff8", "addNftContractSupport(address)", {"nftAddress": p.address}, ),
    addTokenSupport: fun("0x733c237d", "addTokenSupport(address)", {"tokenAddress": p.address}, ),
    bids: viewFun("0x7b3c4baa", "bids(uint256,uint256)", {"_0": p.uint256, "_1": p.uint256}, {"bidder": p.address, "pricePerNFT": p.uint256, "copies": p.uint16, "startTime": p.uint256, "endTime": p.uint256, "status": p.uint8}),
    bulkBuy: fun("0xf0abf752", "bulkBuy(uint256[],uint16[])", {"orderIds": p.array(p.uint256), "amounts": p.array(p.uint16)}, ),
    buyNow: fun("0x369ede15", "buyNow(uint256,uint16)", {"orderId": p.uint256, "copies": p.uint16}, ),
    cancelOrder: fun("0x514fcac7", "cancelOrder(uint256)", {"orderId": p.uint256}, ),
    collectAdminFees: fun("0xd47a269b", "collectAdminFees(address,address)", {"tokenAddress": p.address, "to": p.address}, ),
    feeCollected: viewFun("0x72ce25c2", "feeCollected(address)", {"_0": p.address}, {"feeGenerated": p.uint256, "feeClaimed": p.uint256}),
    initialize: fun("0xfe4b84df", "initialize(uint256)", {"_platformFees": p.uint256}, ),
    nftContracts: viewFun("0xada0f98f", "nftContracts(address)", {"_0": p.address}, p.bool),
    onERC1155BatchReceived: viewFun("0xbc197c81", "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)", {"_0": p.address, "_1": p.address, "_2": p.array(p.uint256), "_3": p.array(p.uint256), "_4": p.bytes}, p.bytes4),
    onERC1155Received: viewFun("0xf23a6e61", "onERC1155Received(address,address,uint256,uint256,bytes)", {"_0": p.address, "_1": p.address, "_2": p.uint256, "_3": p.uint256, "_4": p.bytes}, p.bytes4),
    onERC721Received: viewFun("0x150b7a02", "onERC721Received(address,address,uint256,bytes)", {"_0": p.address, "_1": p.address, "_2": p.uint256, "_3": p.bytes}, p.bytes4),
    order: viewFun("0x21603f43", "order(uint256)", {"_0": p.uint256}, {"tokenId": p.uint256, "pricePerNFT": p.uint256, "copies": p.uint16, "seller": p.address, "startTime": p.uint256, "endTime": p.uint256, "paymentToken": p.address, "nftContract": p.address}),
    orderNonce: viewFun("0x16f8de89", "orderNonce()", {}, p.uint256),
    owner: viewFun("0x8da5cb5b", "owner()", {}, p.address),
    placeOfferForOrder: fun("0xb51def35", "placeOfferForOrder(uint256,uint16,uint256,uint256)", {"orderId": p.uint256, "copies": p.uint16, "pricePerNFT": p.uint256, "endTime": p.uint256}, ),
    placeOrderForSell: fun("0x73865dc3", "placeOrderForSell(uint256,address,uint16,uint256,address,uint256)", {"tokenId": p.uint256, "nftContract": p.address, "copies": p.uint16, "pricePerNFT": p.uint256, "paymentToken": p.address, "endTime": p.uint256}, ),
    platformFees: viewFun("0x194a4e7e", "platformFees()", {}, p.uint256),
    proxiableUUID: viewFun("0x52d1902d", "proxiableUUID()", {}, p.bytes32),
    renounceOwnership: fun("0x715018a6", "renounceOwnership()", {}, ),
    setPlatformFees: fun("0x79caee8c", "setPlatformFees(uint256)", {"fee": p.uint256}, ),
    supportsInterface: viewFun("0x01ffc9a7", "supportsInterface(bytes4)", {"interfaceId": p.bytes4}, p.bool),
    tokensSupport: viewFun("0x0f1dd150", "tokensSupport(address)", {"_0": p.address}, p.bool),
    transferOwnership: fun("0xf2fde38b", "transferOwnership(address)", {"newOwner": p.address}, ),
    upgradeTo: fun("0x3659cfe6", "upgradeTo(address)", {"newImplementation": p.address}, ),
    upgradeToAndCall: fun("0x4f1ef286", "upgradeToAndCall(address,bytes)", {"newImplementation": p.address, "data": p.bytes}, ),
    withdrawRejectBid: fun("0x00f313af", "withdrawRejectBid(uint256,uint256,bool)", {"orderId": p.uint256, "bidId": p.uint256, "isReject": p.bool}, ),
}

export class Contract extends ContractBase {

    bids(_0: BidsParams["_0"], _1: BidsParams["_1"]) {
        return this.eth_call(functions.bids, {_0, _1})
    }

    feeCollected(_0: FeeCollectedParams["_0"]) {
        return this.eth_call(functions.feeCollected, {_0})
    }

    nftContracts(_0: NftContractsParams["_0"]) {
        return this.eth_call(functions.nftContracts, {_0})
    }

    onERC1155BatchReceived(_0: OnERC1155BatchReceivedParams["_0"], _1: OnERC1155BatchReceivedParams["_1"], _2: OnERC1155BatchReceivedParams["_2"], _3: OnERC1155BatchReceivedParams["_3"], _4: OnERC1155BatchReceivedParams["_4"]) {
        return this.eth_call(functions.onERC1155BatchReceived, {_0, _1, _2, _3, _4})
    }

    onERC1155Received(_0: OnERC1155ReceivedParams["_0"], _1: OnERC1155ReceivedParams["_1"], _2: OnERC1155ReceivedParams["_2"], _3: OnERC1155ReceivedParams["_3"], _4: OnERC1155ReceivedParams["_4"]) {
        return this.eth_call(functions.onERC1155Received, {_0, _1, _2, _3, _4})
    }

    onERC721Received(_0: OnERC721ReceivedParams["_0"], _1: OnERC721ReceivedParams["_1"], _2: OnERC721ReceivedParams["_2"], _3: OnERC721ReceivedParams["_3"]) {
        return this.eth_call(functions.onERC721Received, {_0, _1, _2, _3})
    }

    order(_0: OrderParams["_0"]) {
        return this.eth_call(functions.order, {_0})
    }

    orderNonce() {
        return this.eth_call(functions.orderNonce, {})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    platformFees() {
        return this.eth_call(functions.platformFees, {})
    }

    proxiableUUID() {
        return this.eth_call(functions.proxiableUUID, {})
    }

    supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
        return this.eth_call(functions.supportsInterface, {interfaceId})
    }

    tokensSupport(_0: TokensSupportParams["_0"]) {
        return this.eth_call(functions.tokensSupport, {_0})
    }
}

/// Event types
export type AddNFTSupportEventArgs = EParams<typeof events.AddNFTSupport>
export type AddTokenSupportEventArgs = EParams<typeof events.AddTokenSupport>
export type AdminChangedEventArgs = EParams<typeof events.AdminChanged>
export type BeaconUpgradedEventArgs = EParams<typeof events.BeaconUpgraded>
export type BidAcceptedEventArgs = EParams<typeof events.BidAccepted>
export type BidPlacedEventArgs = EParams<typeof events.BidPlaced>
export type BidRejectedEventArgs = EParams<typeof events.BidRejected>
export type BidWithdrawEventArgs = EParams<typeof events.BidWithdraw>
export type ContractUpgradedEventArgs = EParams<typeof events.ContractUpgraded>
export type FeeClaimedEventArgs = EParams<typeof events.FeeClaimed>
export type InitializedEventArgs = EParams<typeof events.Initialized>
export type OrderCancelledEventArgs = EParams<typeof events.OrderCancelled>
export type OrderCreatedEventArgs = EParams<typeof events.OrderCreated>
export type OrderPurchasedEventArgs = EParams<typeof events.OrderPurchased>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type UpgradedEventArgs = EParams<typeof events.Upgraded>

/// Function types
export type AcceptBidParams = FunctionArguments<typeof functions.acceptBid>
export type AcceptBidReturn = FunctionReturn<typeof functions.acceptBid>

export type AddNftContractSupportParams = FunctionArguments<typeof functions.addNftContractSupport>
export type AddNftContractSupportReturn = FunctionReturn<typeof functions.addNftContractSupport>

export type AddTokenSupportParams = FunctionArguments<typeof functions.addTokenSupport>
export type AddTokenSupportReturn = FunctionReturn<typeof functions.addTokenSupport>

export type BidsParams = FunctionArguments<typeof functions.bids>
export type BidsReturn = FunctionReturn<typeof functions.bids>

export type BulkBuyParams = FunctionArguments<typeof functions.bulkBuy>
export type BulkBuyReturn = FunctionReturn<typeof functions.bulkBuy>

export type BuyNowParams = FunctionArguments<typeof functions.buyNow>
export type BuyNowReturn = FunctionReturn<typeof functions.buyNow>

export type CancelOrderParams = FunctionArguments<typeof functions.cancelOrder>
export type CancelOrderReturn = FunctionReturn<typeof functions.cancelOrder>

export type CollectAdminFeesParams = FunctionArguments<typeof functions.collectAdminFees>
export type CollectAdminFeesReturn = FunctionReturn<typeof functions.collectAdminFees>

export type FeeCollectedParams = FunctionArguments<typeof functions.feeCollected>
export type FeeCollectedReturn = FunctionReturn<typeof functions.feeCollected>

export type InitializeParams = FunctionArguments<typeof functions.initialize>
export type InitializeReturn = FunctionReturn<typeof functions.initialize>

export type NftContractsParams = FunctionArguments<typeof functions.nftContracts>
export type NftContractsReturn = FunctionReturn<typeof functions.nftContracts>

export type OnERC1155BatchReceivedParams = FunctionArguments<typeof functions.onERC1155BatchReceived>
export type OnERC1155BatchReceivedReturn = FunctionReturn<typeof functions.onERC1155BatchReceived>

export type OnERC1155ReceivedParams = FunctionArguments<typeof functions.onERC1155Received>
export type OnERC1155ReceivedReturn = FunctionReturn<typeof functions.onERC1155Received>

export type OnERC721ReceivedParams = FunctionArguments<typeof functions.onERC721Received>
export type OnERC721ReceivedReturn = FunctionReturn<typeof functions.onERC721Received>

export type OrderParams = FunctionArguments<typeof functions.order>
export type OrderReturn = FunctionReturn<typeof functions.order>

export type OrderNonceParams = FunctionArguments<typeof functions.orderNonce>
export type OrderNonceReturn = FunctionReturn<typeof functions.orderNonce>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type PlaceOfferForOrderParams = FunctionArguments<typeof functions.placeOfferForOrder>
export type PlaceOfferForOrderReturn = FunctionReturn<typeof functions.placeOfferForOrder>

export type PlaceOrderForSellParams = FunctionArguments<typeof functions.placeOrderForSell>
export type PlaceOrderForSellReturn = FunctionReturn<typeof functions.placeOrderForSell>

export type PlatformFeesParams = FunctionArguments<typeof functions.platformFees>
export type PlatformFeesReturn = FunctionReturn<typeof functions.platformFees>

export type ProxiableUUIDParams = FunctionArguments<typeof functions.proxiableUUID>
export type ProxiableUUIDReturn = FunctionReturn<typeof functions.proxiableUUID>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SetPlatformFeesParams = FunctionArguments<typeof functions.setPlatformFees>
export type SetPlatformFeesReturn = FunctionReturn<typeof functions.setPlatformFees>

export type SupportsInterfaceParams = FunctionArguments<typeof functions.supportsInterface>
export type SupportsInterfaceReturn = FunctionReturn<typeof functions.supportsInterface>

export type TokensSupportParams = FunctionArguments<typeof functions.tokensSupport>
export type TokensSupportReturn = FunctionReturn<typeof functions.tokensSupport>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

export type UpgradeToParams = FunctionArguments<typeof functions.upgradeTo>
export type UpgradeToReturn = FunctionReturn<typeof functions.upgradeTo>

export type UpgradeToAndCallParams = FunctionArguments<typeof functions.upgradeToAndCall>
export type UpgradeToAndCallReturn = FunctionReturn<typeof functions.upgradeToAndCall>

export type WithdrawRejectBidParams = FunctionArguments<typeof functions.withdrawRejectBid>
export type WithdrawRejectBidReturn = FunctionReturn<typeof functions.withdrawRejectBid>

