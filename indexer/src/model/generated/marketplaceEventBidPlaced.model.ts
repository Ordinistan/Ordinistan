import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class MarketplaceEventBidPlaced {
    constructor(props?: Partial<MarketplaceEventBidPlaced>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @DateTimeColumn_({nullable: false})
    blockTimestamp!: Date

    @Index_()
    @StringColumn_({nullable: false})
    transactionHash!: string

    @Index_()
    @StringColumn_({nullable: false})
    contract!: string

    @Index_()
    @StringColumn_({nullable: false})
    eventName!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    orderId!: bigint

    @BigIntColumn_({nullable: false})
    bidIndex!: bigint

    @StringColumn_({nullable: false})
    bidder!: string

    @BigIntColumn_({nullable: false})
    copies!: bigint

    @BigIntColumn_({nullable: false})
    pricePerNft!: bigint

    @BigIntColumn_({nullable: false})
    startTime!: bigint

    @BigIntColumn_({nullable: false})
    endTime!: bigint
}
