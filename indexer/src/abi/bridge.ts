import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    Approval: event("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "Approval(address,address,uint256)", {"owner": indexed(p.address), "approved": indexed(p.address), "tokenId": indexed(p.uint256)}),
    ApprovalForAll: event("0x17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31", "ApprovalForAll(address,address,bool)", {"owner": indexed(p.address), "operator": indexed(p.address), "approved": p.bool}),
    OrdinalBridged: event("0x450e8d94f1e2faa3a02d0f19be286e0a5532c5e345e5455cd0bc6824c483bcc5", "OrdinalBridged(string,uint256,address,string,uint256)", {"inscriptionId": indexed(p.string), "tokenId": indexed(p.uint256), "receiver": indexed(p.address), "contentType": p.string, "satOrdinal": p.uint256}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    Transfer: event("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "Transfer(address,address,uint256)", {"from": indexed(p.address), "to": indexed(p.address), "tokenId": indexed(p.uint256)}),
}

export const functions = {
    HIRO_API_BASE: viewFun("0xfc7765f7", "HIRO_API_BASE()", {}, p.string),
    approve: fun("0x095ea7b3", "approve(address,uint256)", {"to": p.address, "tokenId": p.uint256}, ),
    balanceOf: viewFun("0x70a08231", "balanceOf(address)", {"owner": p.address}, p.uint256),
    bridgeService: viewFun("0xf08d7b39", "bridgeService()", {}, p.address),
    getApproved: viewFun("0x081812fc", "getApproved(uint256)", {"tokenId": p.uint256}, p.address),
    isApprovedForAll: viewFun("0xe985e9c5", "isApprovedForAll(address,address)", {"owner": p.address, "operator": p.address}, p.bool),
    mintBridgedOrdinal: fun("0xdda7e995", "mintBridgedOrdinal(address,uint256,string,uint256,string,uint256,uint256,string,uint256)", {"receiver": p.address, "tokenId": p.uint256, "inscriptionId": p.string, "inscriptionNumber": p.uint256, "contentType": p.string, "contentLength": p.uint256, "satOrdinal": p.uint256, "satRarity": p.string, "genesisTimestamp": p.uint256}, ),
    name: viewFun("0x06fdde03", "name()", {}, p.string),
    ordinalMetadata: viewFun("0xece48c0c", "ordinalMetadata(uint256)", {"_0": p.uint256}, {"inscriptionId": p.string, "inscriptionNumber": p.uint256, "contentType": p.string, "contentLength": p.uint256, "satOrdinal": p.uint256, "satRarity": p.string, "genesisTimestamp": p.uint256, "bridgeTimestamp": p.uint256}),
    owner: viewFun("0x8da5cb5b", "owner()", {}, p.address),
    ownerOf: viewFun("0x6352211e", "ownerOf(uint256)", {"tokenId": p.uint256}, p.address),
    processedInscriptions: viewFun("0x95832029", "processedInscriptions(string)", {"_0": p.string}, p.bool),
    removeProcessedInscription: fun("0x770373d9", "removeProcessedInscription(string)", {"inscriptionId": p.string}, ),
    renounceOwnership: fun("0x715018a6", "renounceOwnership()", {}, ),
    'safeTransferFrom(address,address,uint256)': fun("0x42842e0e", "safeTransferFrom(address,address,uint256)", {"from": p.address, "to": p.address, "tokenId": p.uint256}, ),
    'safeTransferFrom(address,address,uint256,bytes)': fun("0xb88d4fde", "safeTransferFrom(address,address,uint256,bytes)", {"from": p.address, "to": p.address, "tokenId": p.uint256, "data": p.bytes}, ),
    setApprovalForAll: fun("0xa22cb465", "setApprovalForAll(address,bool)", {"operator": p.address, "approved": p.bool}, ),
    supportsInterface: viewFun("0x01ffc9a7", "supportsInterface(bytes4)", {"interfaceId": p.bytes4}, p.bool),
    symbol: viewFun("0x95d89b41", "symbol()", {}, p.string),
    tokenURI: viewFun("0xc87b56dd", "tokenURI(uint256)", {"tokenId": p.uint256}, p.string),
    transferFrom: fun("0x23b872dd", "transferFrom(address,address,uint256)", {"from": p.address, "to": p.address, "tokenId": p.uint256}, ),
    transferOwnership: fun("0xf2fde38b", "transferOwnership(address)", {"newOwner": p.address}, ),
    updateBridgeService: fun("0x351d5599", "updateBridgeService(address)", {"_newBridgeService": p.address}, ),
}

export class Contract extends ContractBase {

    HIRO_API_BASE() {
        return this.eth_call(functions.HIRO_API_BASE, {})
    }

    balanceOf(owner: BalanceOfParams["owner"]) {
        return this.eth_call(functions.balanceOf, {owner})
    }

    bridgeService() {
        return this.eth_call(functions.bridgeService, {})
    }

    getApproved(tokenId: GetApprovedParams["tokenId"]) {
        return this.eth_call(functions.getApproved, {tokenId})
    }

    isApprovedForAll(owner: IsApprovedForAllParams["owner"], operator: IsApprovedForAllParams["operator"]) {
        return this.eth_call(functions.isApprovedForAll, {owner, operator})
    }

    name() {
        return this.eth_call(functions.name, {})
    }

    ordinalMetadata(_0: OrdinalMetadataParams["_0"]) {
        return this.eth_call(functions.ordinalMetadata, {_0})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    ownerOf(tokenId: OwnerOfParams["tokenId"]) {
        return this.eth_call(functions.ownerOf, {tokenId})
    }

    processedInscriptions(_0: ProcessedInscriptionsParams["_0"]) {
        return this.eth_call(functions.processedInscriptions, {_0})
    }

    supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
        return this.eth_call(functions.supportsInterface, {interfaceId})
    }

    symbol() {
        return this.eth_call(functions.symbol, {})
    }

    tokenURI(tokenId: TokenURIParams["tokenId"]) {
        return this.eth_call(functions.tokenURI, {tokenId})
    }
}

/// Event types
export type ApprovalEventArgs = EParams<typeof events.Approval>
export type ApprovalForAllEventArgs = EParams<typeof events.ApprovalForAll>
export type OrdinalBridgedEventArgs = EParams<typeof events.OrdinalBridged>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type TransferEventArgs = EParams<typeof events.Transfer>

/// Function types
export type HIRO_API_BASEParams = FunctionArguments<typeof functions.HIRO_API_BASE>
export type HIRO_API_BASEReturn = FunctionReturn<typeof functions.HIRO_API_BASE>

export type ApproveParams = FunctionArguments<typeof functions.approve>
export type ApproveReturn = FunctionReturn<typeof functions.approve>

export type BalanceOfParams = FunctionArguments<typeof functions.balanceOf>
export type BalanceOfReturn = FunctionReturn<typeof functions.balanceOf>

export type BridgeServiceParams = FunctionArguments<typeof functions.bridgeService>
export type BridgeServiceReturn = FunctionReturn<typeof functions.bridgeService>

export type GetApprovedParams = FunctionArguments<typeof functions.getApproved>
export type GetApprovedReturn = FunctionReturn<typeof functions.getApproved>

export type IsApprovedForAllParams = FunctionArguments<typeof functions.isApprovedForAll>
export type IsApprovedForAllReturn = FunctionReturn<typeof functions.isApprovedForAll>

export type MintBridgedOrdinalParams = FunctionArguments<typeof functions.mintBridgedOrdinal>
export type MintBridgedOrdinalReturn = FunctionReturn<typeof functions.mintBridgedOrdinal>

export type NameParams = FunctionArguments<typeof functions.name>
export type NameReturn = FunctionReturn<typeof functions.name>

export type OrdinalMetadataParams = FunctionArguments<typeof functions.ordinalMetadata>
export type OrdinalMetadataReturn = FunctionReturn<typeof functions.ordinalMetadata>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type OwnerOfParams = FunctionArguments<typeof functions.ownerOf>
export type OwnerOfReturn = FunctionReturn<typeof functions.ownerOf>

export type ProcessedInscriptionsParams = FunctionArguments<typeof functions.processedInscriptions>
export type ProcessedInscriptionsReturn = FunctionReturn<typeof functions.processedInscriptions>

export type RemoveProcessedInscriptionParams = FunctionArguments<typeof functions.removeProcessedInscription>
export type RemoveProcessedInscriptionReturn = FunctionReturn<typeof functions.removeProcessedInscription>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type SafeTransferFromParams_0 = FunctionArguments<typeof functions['safeTransferFrom(address,address,uint256)']>
export type SafeTransferFromReturn_0 = FunctionReturn<typeof functions['safeTransferFrom(address,address,uint256)']>

export type SafeTransferFromParams_1 = FunctionArguments<typeof functions['safeTransferFrom(address,address,uint256,bytes)']>
export type SafeTransferFromReturn_1 = FunctionReturn<typeof functions['safeTransferFrom(address,address,uint256,bytes)']>

export type SetApprovalForAllParams = FunctionArguments<typeof functions.setApprovalForAll>
export type SetApprovalForAllReturn = FunctionReturn<typeof functions.setApprovalForAll>

export type SupportsInterfaceParams = FunctionArguments<typeof functions.supportsInterface>
export type SupportsInterfaceReturn = FunctionReturn<typeof functions.supportsInterface>

export type SymbolParams = FunctionArguments<typeof functions.symbol>
export type SymbolReturn = FunctionReturn<typeof functions.symbol>

export type TokenURIParams = FunctionArguments<typeof functions.tokenURI>
export type TokenURIReturn = FunctionReturn<typeof functions.tokenURI>

export type TransferFromParams = FunctionArguments<typeof functions.transferFrom>
export type TransferFromReturn = FunctionReturn<typeof functions.transferFrom>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

export type UpdateBridgeServiceParams = FunctionArguments<typeof functions.updateBridgeService>
export type UpdateBridgeServiceReturn = FunctionReturn<typeof functions.updateBridgeService>

