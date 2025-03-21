import {bridge, marketplace} from './mapping'
import {processor} from './processor'
import {db, Store} from './db'
import {EntityBuffer} from './entityBuffer'
import {Block, Transaction} from './model'

processor.run(db, async (ctx) => {
    for (let block of ctx.blocks) {
        EntityBuffer.add(
            new Block({
                id: block.header.id,
                number: block.header.height,
                timestamp: new Date(block.header.timestamp),
            })
        )

        for (let log of block.logs) {
            if (log.address === '0x13748584ea70ddd16273af9a4797836d9eb7e7aa') {
                bridge.parseEvent(ctx, log)
            }
            if (log.address === '0x5eafc51b0d71c2d3de27b3b1b151f5178fe80111') {
                marketplace.parseEvent(ctx, log)
            }
        }

        for (let transaction of block.transactions) {
            if (transaction.to === '0x13748584ea70ddd16273af9a4797836d9eb7e7aa') {
                bridge.parseFunction(ctx, transaction)
            }
            if (transaction.to === '0x5eafc51b0d71c2d3de27b3b1b151f5178fe80111') {
                marketplace.parseFunction(ctx, transaction)
            }

            EntityBuffer.add(
                new Transaction({
                    id: transaction.id,
                    blockNumber: block.header.height,
                    blockTimestamp: new Date(block.header.timestamp),
                    hash: transaction.hash,
                    to: transaction.to,
                    from: transaction.from,
                    status: transaction.status,
                })
            )
        }
    }

    for (let entities of EntityBuffer.flush()) {
        await ctx.store.insert(entities)
    }
})
