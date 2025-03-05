import {DataHandlerContext} from '@subsquid/evm-processor'
import {Store} from '../db'
import {functions, events} from '../abi/lightRelay'
import * as eventHandlers from '../handlers/lightRelay_events'
import * as functionHandlers from '../handlers/lightRelay_functions'
import {Log, Transaction} from '../processor'

const address = '0x0000000000000000000000000000000000000000'


export function parseEvent(ctx: DataHandlerContext<Store>, log: Log) {
    try {
        if (events['AuthorizationRequirementChanged'].is(log)) {
            return eventHandlers.handleAuthorizationRequirementChangedEvent(ctx, log)
        }
        if (events['Genesis'].is(log)) {
            return eventHandlers.handleGenesisEvent(ctx, log)
        }
        if (events['OwnershipTransferred'].is(log)) {
            return eventHandlers.handleOwnershipTransferredEvent(ctx, log)
        }
        if (events['ProofLengthChanged'].is(log)) {
            return eventHandlers.handleProofLengthChangedEvent(ctx, log)
        }
        if (events['Retarget'].is(log)) {
            return eventHandlers.handleRetargetEvent(ctx, log)
        }
        if (events['SubmitterAuthorized'].is(log)) {
            return eventHandlers.handleSubmitterAuthorizedEvent(ctx, log)
        }
        if (events['SubmitterDeauthorized'].is(log)) {
            return eventHandlers.handleSubmitterDeauthorizedEvent(ctx, log)
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
