import type {DataHandlerContext} from '@subsquid/evm-processor'
import type {Store} from '../db'
import {events} from '../abi/bridge'
import {EntityBuffer} from '../entityBuffer'
import {BridgeEventApproval, BridgeEventApprovalForAll, BridgeEventOrdinalBridged, BridgeEventOwnershipTransferred, BridgeEventTransfer} from '../model'
import {Log} from '../processor'

export function handleApprovalEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Approval'].decode(log)
    EntityBuffer.add(
        new BridgeEventApproval({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction?.hash || '',
            contract: log.address,
            eventName: 'Approval',
            owner: e.owner,
            approved: e.approved,
            tokenId: e.tokenId,
        })
    )
}
export function handleApprovalForAllEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['ApprovalForAll'].decode(log)
    EntityBuffer.add(
        new BridgeEventApprovalForAll({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction?.hash || '',
            contract: log.address,
            eventName: 'ApprovalForAll',
            owner: e.owner,
            operator: e.operator,
            approved: e.approved,
        })
    )
}
export function handleOrdinalBridgedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OrdinalBridged'].decode(log)
    EntityBuffer.add(
        new BridgeEventOrdinalBridged({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction?.hash || '',
            contract: log.address,
            eventName: 'OrdinalBridged',
            inscriptionId: e.inscriptionId,
            tokenId: e.tokenId,
            receiver: e.receiver,
            contentType: e.contentType,
            satOrdinal: e.satOrdinal,
        })
    )
}
export function handleOwnershipTransferredEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OwnershipTransferred'].decode(log)
    EntityBuffer.add(
        new BridgeEventOwnershipTransferred({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction?.hash || '',
            contract: log.address,
            eventName: 'OwnershipTransferred',
            previousOwner: e.previousOwner,
            newOwner: e.newOwner,
        })
    )
}
export function handleTransferEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Transfer'].decode(log)
    EntityBuffer.add(
        new BridgeEventTransfer({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction?.hash || '',
            contract: log.address,
            eventName: 'Transfer',
            from: e.from,
            to: e.to,
            tokenId: e.tokenId,
        })
    )
}
