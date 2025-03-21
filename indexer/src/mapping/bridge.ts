import {DataHandlerContext} from '@subsquid/evm-processor'
import {Store} from '../db'
import {functions, events} from '../abi/bridge'
import * as eventHandlers from '../handlers/bridge_events'
import * as functionHandlers from '../handlers/bridge_functions'
import {Log, Transaction} from '../processor'

const address = '0x13748584ea70ddd16273af9a4797836d9eb7e7aa'


export function parseEvent(ctx: DataHandlerContext<Store>, log: Log) {
    try {
        if (events['Approval'].is(log)) {
            return eventHandlers.handleApprovalEvent(ctx, log)
        }
        if (events['ApprovalForAll'].is(log)) {
            return eventHandlers.handleApprovalForAllEvent(ctx, log)
        }
        if (events['OrdinalBridged'].is(log)) {
            return eventHandlers.handleOrdinalBridgedEvent(ctx, log)
        }
        if (events['OwnershipTransferred'].is(log)) {
            return eventHandlers.handleOwnershipTransferredEvent(ctx, log)
        }
        if (events['Transfer'].is(log)) {
            return eventHandlers.handleTransferEvent(ctx, log)
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
