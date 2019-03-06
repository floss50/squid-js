import {assert} from "chai"
import ConfigProvider from "../../../src/ConfigProvider"
import { EscrowReward } from "../../../src/keeper/contracts/conditions"
import Keeper from "../../../src/keeper/Keeper"
import config from "../../config"
import TestContractHandler from "../TestContractHandler"

let condition: EscrowReward

describe("EscrowReward", () => {

    const agreementId = `0x${"a".repeat(64)}`
    const did = `0x${"a".repeat(64)}`
    const amount = 15
    const publisher = `0x${"a".repeat(40)}`
    const consumer = `0x${"b".repeat(40)}`
    let lockCondition
    let releaseCondition

    before(async () => {
        ConfigProvider.setConfig(config)
        await TestContractHandler.prepareContracts()
        const keeper = await Keeper.getInstance()
        condition = keeper.conditions.escrowReward

        lockCondition = await keeper.conditions.lockRewardCondition.generateIdHash(agreementId, publisher, amount)
        releaseCondition = await keeper.conditions.accessSecretStoreCondition.generateIdHash(agreementId, did, consumer)
    })

    describe("#hashValues()", () => {
        it("should hash the values", async () => {
            const hash = await condition.hashValues(amount, consumer, publisher, lockCondition, releaseCondition)

            assert.match(hash, /^0x[a-f0-9]{64}$/i)
        })
    })

    describe("#generateId()", () => {
        it("should generate an ID", async () => {
            const hash = await condition.hashValues(amount, consumer, publisher, lockCondition, releaseCondition)
            const id = await condition.generateId(agreementId, hash)

            assert.match(id, /^0x[a-f0-9]{64}$/i)
        })
    })
})
