import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, IntColumn as IntColumn_, Index as Index_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class BridgeEventOrdinalBridged {
    constructor(props?: Partial<BridgeEventOrdinalBridged>) {
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
    @StringColumn_({nullable: false})
    inscriptionId!: string

    @Index_()
    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    receiver!: string

    @StringColumn_({nullable: false})
    contentType!: string

    @BigIntColumn_({nullable: false})
    satOrdinal!: bigint
}
