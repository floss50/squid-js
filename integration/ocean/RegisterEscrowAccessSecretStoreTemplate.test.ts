import { assert } from 'chai'

import { config } from "../config"

import { Ocean, templates, conditions, generateId, Keeper } from '../../src' // @oceanprotocol/squid

const { LockRewardCondition, EscrowReward, AccessSecretStoreCondition } = conditions
const { EscrowAccessSecretStoreTemplate } = templates

describe("Register Escrow Access Secret Store Template", () => {
    let ocean: Ocean
    let keeper: Keeper

    const agreementId = `0x${generateId()}`
    const escrowAmount = 12
    const did = `0x${"a".repeat(64)}`
    const url = 'https://example.com/did/ocean/test-attr-example.txt'
    const checksum = "b".repeat(32)

    let templateManagerOwner: string
    let sender: string
    let receiver: string

    let accessSecretStoreCondition: conditions.AccessSecretStoreCondition
    let lockRewardCondition: conditions.LockRewardCondition
    let escrowReward: conditions.EscrowReward

    let template: templates.EscrowAccessSecretStoreTemplate

    let conditionIdAccess: string
    let conditionIdLock: string
    let conditionIdEscrow: string

    before(async () => {
        ocean = await Ocean.getInstance(config)
        keeper = await Keeper.getInstance()

        template = await EscrowAccessSecretStoreTemplate.getInstance()

        // Accounts
        templateManagerOwner = (await ocean.accounts.list())[0].getId()
        sender = (await ocean.accounts.list())[1].getId()
        receiver = (await ocean.accounts.list())[2].getId()

        // Conditions
        accessSecretStoreCondition = await AccessSecretStoreCondition.getInstance()
        lockRewardCondition = await LockRewardCondition.getInstance()
        escrowReward = await EscrowReward.getInstance()
    })

    it("should propose the template", async () => {
        await keeper.templateStoreManager.proposeTemplate(template.getAddress(), receiver, true)
        // TODO: Use a event to detect template mined
        await new Promise(_ => setTimeout(_, 6 * 1000))
    })

    it("should approve the template", async () => {
        await keeper.templateStoreManager.approveTemplate(template.getAddress(), templateManagerOwner, true)
        // TODO: Use a event to detect template mined
        await new Promise(_ => setTimeout(_, 6 * 1000))
    })

    it("should generate the condition IDs", async () => {
        conditionIdAccess = await accessSecretStoreCondition.generateId(agreementId, await accessSecretStoreCondition.hashValues(did, receiver))
        conditionIdLock = await lockRewardCondition.generateIdHash(agreementId, await escrowReward.getAddress(), escrowAmount)
        conditionIdEscrow = await escrowReward.generateId(agreementId, await escrowReward.hashValues(escrowAmount, receiver, sender, conditionIdLock, conditionIdAccess))
    })

    it("should have conditions types", async () => {
        const conditionTypes = await template.getConditionTypes()

        assert.equal(conditionTypes.length, 3, "Expected 3 conditions.")
        assert.deepEqual(
            [...conditionTypes].sort(),
            [accessSecretStoreCondition.getAddress(), escrowReward.getAddress(), lockRewardCondition.getAddress()].sort(),
            "The conditions doesn't match",
        )
    })

    it("should have condition instances asociated", async () => {
        const conditions = await template.getConditions()

        assert.equal(conditions.length, 3, "Expected 3 conditions.")


        const conditionClasses = [AccessSecretStoreCondition, EscrowReward, LockRewardCondition]
        conditionClasses
            .forEach(conditionClass => {
                if (!conditions.find(condition => condition instanceof conditionClass)) {
                    throw `${conditionClass.name} is not part of the conditions.`;
                }
            })
    })

    it("should create a new agreement", async () => {
        await keeper.didRegistry.registerAttribute(did.replace("0x", ""), checksum, url, sender)

        const agreement = await template.createAgreement(
            agreementId,
            did,
            [conditionIdAccess, conditionIdLock, conditionIdEscrow],
            [0, 0, 0],
            [0, 0, 0],
            receiver,
        )

        assert.isTrue(agreement.status)
    })
})
