import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    AuthorizationRequirementChanged: event("0xd813b248d49c8bf08be2b6947126da6763df310beed7bea97756456c5727419a", "AuthorizationRequirementChanged(bool)", {"newStatus": p.bool}),
    Genesis: event("0x2381d16925551c2fb1a5edfcf4fce2f6d085e1f85f4b88340c09c9d191f9d4e9", "Genesis(uint256)", {"blockHeight": p.uint256}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
    ProofLengthChanged: event("0x3e9f904d8cf11753c79b67c8259c582056d4a7d8af120f81257a59eeb8824b96", "ProofLengthChanged(uint256)", {"newLength": p.uint256}),
    Retarget: event("0xa282ee798b132f9dc11e06cd4d8e767e562be8709602ca14fea7ab3392acbdab", "Retarget(uint256,uint256)", {"oldDifficulty": p.uint256, "newDifficulty": p.uint256}),
    SubmitterAuthorized: event("0xd53649b492f738bb59d6825099b5955073efda0bf9e3a7ad20da22e110122e29", "SubmitterAuthorized(address)", {"submitter": p.address}),
    SubmitterDeauthorized: event("0x7498b96beeabea5ad3139f1a2861a03e480034254e36b10aae2e6e42ad7b4b68", "SubmitterDeauthorized(address)", {"submitter": p.address}),
}

export const functions = {
    authorizationRequired: viewFun("0x95410d2b", "authorizationRequired()", {}, p.bool),
    authorize: fun("0xb6a5d7de", "authorize(address)", {"submitter": p.address}, ),
    currentEpoch: viewFun("0x76671808", "currentEpoch()", {}, p.uint64),
    deauthorize: fun("0x27c97fa5", "deauthorize(address)", {"submitter": p.address}, ),
    genesis: fun("0x4ca49f51", "genesis(bytes,uint256,uint64)", {"genesisHeader": p.bytes, "genesisHeight": p.uint256, "genesisProofLength": p.uint64}, ),
    genesisEpoch: viewFun("0xb70e6be6", "genesisEpoch()", {}, p.uint64),
    getBlockDifficulty: viewFun("0x06a27422", "getBlockDifficulty(uint256)", {"blockNumber": p.uint256}, p.uint256),
    getCurrentAndPrevEpochDifficulty: viewFun("0x3a1b77b0", "getCurrentAndPrevEpochDifficulty()", {}, {"current": p.uint256, "previous": p.uint256}),
    getCurrentEpochDifficulty: viewFun("0x113764be", "getCurrentEpochDifficulty()", {}, p.uint256),
    getEpochDifficulty: viewFun("0x620414e6", "getEpochDifficulty(uint256)", {"epochNumber": p.uint256}, p.uint256),
    getPrevEpochDifficulty: viewFun("0x2b97be24", "getPrevEpochDifficulty()", {}, p.uint256),
    getRelayRange: viewFun("0x10b76ed8", "getRelayRange()", {}, {"relayGenesis": p.uint256, "currentEpochEnd": p.uint256}),
    isAuthorized: viewFun("0xfe9fbb80", "isAuthorized(address)", {"_0": p.address}, p.bool),
    owner: viewFun("0x8da5cb5b", "owner()", {}, p.address),
    proofLength: viewFun("0xf5619fda", "proofLength()", {}, p.uint64),
    ready: viewFun("0x6defbf80", "ready()", {}, p.bool),
    renounceOwnership: fun("0x715018a6", "renounceOwnership()", {}, ),
    retarget: fun("0x7ca5b1dd", "retarget(bytes)", {"headers": p.bytes}, ),
    setAuthorizationStatus: fun("0xeb8695ef", "setAuthorizationStatus(bool)", {"status": p.bool}, ),
    setProofLength: fun("0x19c9aa32", "setProofLength(uint64)", {"newLength": p.uint64}, ),
    transferOwnership: fun("0xf2fde38b", "transferOwnership(address)", {"newOwner": p.address}, ),
    validateChain: viewFun("0x189179a3", "validateChain(bytes)", {"headers": p.bytes}, {"startingHeaderTimestamp": p.uint256, "headerCount": p.uint256}),
}

export class Contract extends ContractBase {

    authorizationRequired() {
        return this.eth_call(functions.authorizationRequired, {})
    }

    currentEpoch() {
        return this.eth_call(functions.currentEpoch, {})
    }

    genesisEpoch() {
        return this.eth_call(functions.genesisEpoch, {})
    }

    getBlockDifficulty(blockNumber: GetBlockDifficultyParams["blockNumber"]) {
        return this.eth_call(functions.getBlockDifficulty, {blockNumber})
    }

    getCurrentAndPrevEpochDifficulty() {
        return this.eth_call(functions.getCurrentAndPrevEpochDifficulty, {})
    }

    getCurrentEpochDifficulty() {
        return this.eth_call(functions.getCurrentEpochDifficulty, {})
    }

    getEpochDifficulty(epochNumber: GetEpochDifficultyParams["epochNumber"]) {
        return this.eth_call(functions.getEpochDifficulty, {epochNumber})
    }

    getPrevEpochDifficulty() {
        return this.eth_call(functions.getPrevEpochDifficulty, {})
    }

    getRelayRange() {
        return this.eth_call(functions.getRelayRange, {})
    }

    isAuthorized(_0: IsAuthorizedParams["_0"]) {
        return this.eth_call(functions.isAuthorized, {_0})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    proofLength() {
        return this.eth_call(functions.proofLength, {})
    }

    ready() {
        return this.eth_call(functions.ready, {})
    }

    validateChain(headers: ValidateChainParams["headers"]) {
        return this.eth_call(functions.validateChain, {headers})
    }
}

/// Event types
export type AuthorizationRequirementChangedEventArgs = EParams<typeof events.AuthorizationRequirementChanged>
export type GenesisEventArgs = EParams<typeof events.Genesis>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>
export type ProofLengthChangedEventArgs = EParams<typeof events.ProofLengthChanged>
export type RetargetEventArgs = EParams<typeof events.Retarget>
export type SubmitterAuthorizedEventArgs = EParams<typeof events.SubmitterAuthorized>
export type SubmitterDeauthorizedEventArgs = EParams<typeof events.SubmitterDeauthorized>

/// Function types
export type AuthorizationRequiredParams = FunctionArguments<typeof functions.authorizationRequired>
export type AuthorizationRequiredReturn = FunctionReturn<typeof functions.authorizationRequired>

export type AuthorizeParams = FunctionArguments<typeof functions.authorize>
export type AuthorizeReturn = FunctionReturn<typeof functions.authorize>

export type CurrentEpochParams = FunctionArguments<typeof functions.currentEpoch>
export type CurrentEpochReturn = FunctionReturn<typeof functions.currentEpoch>

export type DeauthorizeParams = FunctionArguments<typeof functions.deauthorize>
export type DeauthorizeReturn = FunctionReturn<typeof functions.deauthorize>

export type GenesisParams = FunctionArguments<typeof functions.genesis>
export type GenesisReturn = FunctionReturn<typeof functions.genesis>

export type GenesisEpochParams = FunctionArguments<typeof functions.genesisEpoch>
export type GenesisEpochReturn = FunctionReturn<typeof functions.genesisEpoch>

export type GetBlockDifficultyParams = FunctionArguments<typeof functions.getBlockDifficulty>
export type GetBlockDifficultyReturn = FunctionReturn<typeof functions.getBlockDifficulty>

export type GetCurrentAndPrevEpochDifficultyParams = FunctionArguments<typeof functions.getCurrentAndPrevEpochDifficulty>
export type GetCurrentAndPrevEpochDifficultyReturn = FunctionReturn<typeof functions.getCurrentAndPrevEpochDifficulty>

export type GetCurrentEpochDifficultyParams = FunctionArguments<typeof functions.getCurrentEpochDifficulty>
export type GetCurrentEpochDifficultyReturn = FunctionReturn<typeof functions.getCurrentEpochDifficulty>

export type GetEpochDifficultyParams = FunctionArguments<typeof functions.getEpochDifficulty>
export type GetEpochDifficultyReturn = FunctionReturn<typeof functions.getEpochDifficulty>

export type GetPrevEpochDifficultyParams = FunctionArguments<typeof functions.getPrevEpochDifficulty>
export type GetPrevEpochDifficultyReturn = FunctionReturn<typeof functions.getPrevEpochDifficulty>

export type GetRelayRangeParams = FunctionArguments<typeof functions.getRelayRange>
export type GetRelayRangeReturn = FunctionReturn<typeof functions.getRelayRange>

export type IsAuthorizedParams = FunctionArguments<typeof functions.isAuthorized>
export type IsAuthorizedReturn = FunctionReturn<typeof functions.isAuthorized>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type ProofLengthParams = FunctionArguments<typeof functions.proofLength>
export type ProofLengthReturn = FunctionReturn<typeof functions.proofLength>

export type ReadyParams = FunctionArguments<typeof functions.ready>
export type ReadyReturn = FunctionReturn<typeof functions.ready>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type RetargetParams = FunctionArguments<typeof functions.retarget>
export type RetargetReturn = FunctionReturn<typeof functions.retarget>

export type SetAuthorizationStatusParams = FunctionArguments<typeof functions.setAuthorizationStatus>
export type SetAuthorizationStatusReturn = FunctionReturn<typeof functions.setAuthorizationStatus>

export type SetProofLengthParams = FunctionArguments<typeof functions.setProofLength>
export type SetProofLengthReturn = FunctionReturn<typeof functions.setProofLength>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

export type ValidateChainParams = FunctionArguments<typeof functions.validateChain>
export type ValidateChainReturn = FunctionReturn<typeof functions.validateChain>

