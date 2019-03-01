import { assert } from 'chai'

import { config } from "../config"

import { Ocean, templates, conditions, generateId, Keeper, Account } from '../../src' // @oceanprotocol/squid

const { LockRewardCondition, EscrowReward, AccessSecretStoreCondition } = conditions
const { EscrowAccessSecretStoreTemplate } = templates

describe("Register Escrow Access Secret Store Template", () => {
    let ocean: Ocean
    let keeper: Keeper

    const agreementId = `0x${generateId()}`
    const escrowAmount = 12
    const did = `0x${generateId()}`
    const url = 'https://example.com/did/ocean/test-attr-example.txt'
    const checksum = "b".repeat(32)

    let templateManagerOwner: Account
    let publisher: Account
    let consumer: Account

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
        templateManagerOwner = (await ocean.accounts.list())[0]
        publisher = (await ocean.accounts.list())[1]
        consumer = (await ocean.accounts.list())[2]

        // Conditions
        accessSecretStoreCondition = await AccessSecretStoreCondition.getInstance()
        lockRewardCondition = await LockRewardCondition.getInstance()
        escrowReward = await EscrowReward.getInstance()
    })

    it("should propose the template", async () => {
        await keeper.templateStoreManager.proposeTemplate(template.getAddress(), consumer.getId(), true)
        // TODO: Use a event to detect template mined
        await new Promise(_ => setTimeout(_, 6 * 1000))
    })

    it("should approve the template", async () => {
        await keeper.templateStoreManager.approveTemplate(template.getAddress(), templateManagerOwner.getId(), true)
        // TODO: Use a event to detect template mined
        await new Promise(_ => setTimeout(_, 6 * 1000))
    })

    it("should register a DID", async () => {
        await keeper.didRegistry.registerAttribute(did.replace("0x", ""), checksum, url, publisher.getId())
    })

    it("should generate the condition IDs", async () => {
        conditionIdAccess = await accessSecretStoreCondition.generateIdHash(agreementId, did, consumer.getId())
        conditionIdLock = await lockRewardCondition.generateIdHash(agreementId, await escrowReward.getAddress(), escrowAmount)
        conditionIdEscrow = await escrowReward.generateIdHash(
            agreementId,
            escrowAmount,
            consumer.getId(),
            publisher.getId(),
            conditionIdLock,
            conditionIdAccess,
        )
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
        const agreement = await template.createAgreement(
            agreementId,
            did,
            [conditionIdAccess, conditionIdLock, conditionIdEscrow],
            [0, 0, 0],
            [0, 0, 0],
            consumer.getId(),
        )

        assert.isTrue(agreement.status)
    })

    it("should fulfill LockRewardCondition", async () => {
        await consumer.requestTokens(escrowAmount)

        await keeper.token.approve(lockRewardCondition.getAddress(), escrowAmount, consumer.getId())

        const fulfill = await lockRewardCondition.fulfill(agreementId, escrowReward.getAddress(), escrowAmount, consumer.getId())

        assert.isDefined(fulfill.events.Fulfilled, "Not Fulfilled event.")
    })

    it("should fulfill AccessSecretStoreCondition", async () => {
        const fulfill = await accessSecretStoreCondition.fulfill(agreementId, did, consumer.getId(), publisher.getId())

        assert.isDefined(fulfill.events.Fulfilled, "Not Fulfilled event.")
    })

    it("should fulfill EscrowReward", async () => {
        const fulfill = await escrowReward.fulfill(
            agreementId,
            escrowAmount,
            consumer.getId(),
            publisher.getId(),
            conditionIdLock,
            conditionIdAccess,
            consumer.getId(),
        )

        assert.isDefined(fulfill.events.Fulfilled, "Not Fulfilled event.")
    })

    it("should grant the access to the consumer", async () => {
        const accessGranted = await accessSecretStoreCondition.checkPermissions(consumer.getId(), did)

        assert.isTrue(accessGranted, "Consumer has not been granted.")
    })
})
