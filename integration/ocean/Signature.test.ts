import { assert } from "chai"

import { config } from "../config"

import { Ocean, Account, DDO, Keeper } from "../../src" // @oceanprotocol/squid

import ServiceAgreement from "../../src/ocean/ServiceAgreements/ServiceAgreement"

// WARN: not integration test. It has been done here because constant values
// depends on the first account on spree (only accessible from integration test)
describe("Signature", () => {

    let consumer: Account

    before(async () => {
        await Ocean.getInstance(config)

        // Accounts
        consumer = new Account("0x00bd138abd70e2f00903268f3db08f2d25677c9e")
        consumer.setPassword("node0")
    })

    it("should generate the correct signature", async () => {
        const templateId = `0x${"f".repeat(40)}`
        const agreementId = `0x${"e".repeat(64)}`

        const accessId = `0x${"a".repeat(64)}`
        const lockId = `0x${"b".repeat(64)}`
        const escrowId = `0x${"c".repeat(64)}`

        const hash = await ServiceAgreement.hashServiceAgreement(
            templateId,
            agreementId,
            [accessId, lockId, escrowId],
            [0, 0, 0],
            [0, 0, 0],
        )

        assert.equal(hash, "0x67901517c18a3d23e05806fff7f04235cc8ae3b1f82345b8bfb3e4b02b5800c7", "The signatuere is not correct.")
    })

    it("should generate the correct signature", async () => {
        const templates = (await Keeper.getInstance()).templates

        const did = `did:op:${"c".repeat(64)}`
        const templateId = `0x${"f".repeat(40)}`
        const agreementId = `0x${"e".repeat(64)}`
        const ddoOwner = `0x${"9".repeat(40)}`
        const serviceDefinitionId = "0"
        const amount = "10"

        const accessId = `0x${"a".repeat(64)}`
        const lockId = `0x${"b".repeat(64)}`

        const serviceAgreementTemplate = await templates.escrowAccessSecretStoreTemplate.getServiceAgreementTemplate()

        const ddo = new DDO({
            id: did,
            service: [
                {
                    type: "Access",
                    purchaseEndpoint: undefined,
                    serviceEndpoint: undefined,
                    serviceDefinitionId,
                    templateId,
                    serviceAgreementTemplate,
                } as any,
            ],
        })


        const valuesMap = {
            rewardAddress: ddoOwner,
            amount,
            documentId: ddo.shortId(),
            grantee: consumer.getId(),
            receiver: consumer.getId(),
            sender: ddoOwner,

            lockCondition: lockId,
            releaseCondition: accessId,
        }

        const signature = await ServiceAgreement.signServiceAgreement(
            ddo,
            serviceDefinitionId,
            agreementId,
            valuesMap,
            consumer,
        )

        assert.equal(
            signature,
            // tslint:disable-next-line
            "0x6bd49301a4a98d4e2ca149d649cc22fa0c5bd69269716d91c5cc17576ec3caef12a0edf611bb318e684683eec77b202bbbe484ceb698aec0e1250b7d1cf874dd1c",
            "The signatuere is not correct.",
        )
    })
})
