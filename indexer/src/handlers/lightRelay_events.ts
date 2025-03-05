import type {DataHandlerContext} from '@subsquid/evm-processor'
import type {Store} from '../db'
import {events} from '../abi/lightRelay'
import {EntityBuffer} from '../entityBuffer'
import {LightRelayEventAuthorizationRequirementChanged, LightRelayEventGenesis, LightRelayEventOwnershipTransferred, LightRelayEventProofLengthChanged, LightRelayEventRetarget, LightRelayEventSubmitterAuthorized, LightRelayEventSubmitterDeauthorized} from '../model'
import {Log} from '../processor'

export function handleAuthorizationRequirementChangedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['AuthorizationRequirementChanged'].decode(log)
    EntityBuffer.add(
        new LightRelayEventAuthorizationRequirementChanged({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'AuthorizationRequirementChanged',
            newStatus: e.newStatus,
        })
    )
}
export function handleGenesisEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Genesis'].decode(log)
    EntityBuffer.add(
        new LightRelayEventGenesis({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'Genesis',
            blockHeight: e.blockHeight,
        })
    )
}
export function handleOwnershipTransferredEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['OwnershipTransferred'].decode(log)
    EntityBuffer.add(
        new LightRelayEventOwnershipTransferred({
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
export function handleProofLengthChangedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['ProofLengthChanged'].decode(log)
    EntityBuffer.add(
        new LightRelayEventProofLengthChanged({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'ProofLengthChanged',
            newLength: e.newLength,
        })
    )
}
export function handleRetargetEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['Retarget'].decode(log)
    EntityBuffer.add(
        new LightRelayEventRetarget({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'Retarget',
            oldDifficulty: e.oldDifficulty,
            newDifficulty: e.newDifficulty,
        })
    )
}
export function handleSubmitterAuthorizedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['SubmitterAuthorized'].decode(log)
    EntityBuffer.add(
        new LightRelayEventSubmitterAuthorized({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'SubmitterAuthorized',
            submitter: e.submitter,
        })
    )
}
export function handleSubmitterDeauthorizedEvent(ctx: DataHandlerContext<Store>, log: Log) {
    const e = events['SubmitterDeauthorized'].decode(log)
    EntityBuffer.add(
        new LightRelayEventSubmitterDeauthorized({
            id: log.id,
            blockNumber: log.block.height,
            blockTimestamp: new Date(log.block.timestamp),
            transactionHash: log.transaction!.hash,
            contract: log.address,
            eventName: 'SubmitterDeauthorized',
            submitter: e.submitter,
        })
    )
}
