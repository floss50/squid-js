import { AgreementTemplate } from "./AgreementTemplate.abstract"
import { LockRewardCondition, EscrowReward, AccessSecretStoreCondition } from '../conditions'
import DIDRegistry from '../DIDRegistry'
import Keeper from "../../Keeper"
import { DDO } from '../../../ddo/DDO'
import { generateId, zeroX } from '../../../utils'

import { escrowAccessSecretStoreTemplateServiceAgreementTemplate } from "./EscrowAccessSecretStoreTemplate.serviceAgreementTemplate"

export class EscrowAccessSecretStoreTemplate extends AgreementTemplate {

    public static async getInstance(): Promise<EscrowAccessSecretStoreTemplate> {
        return AgreementTemplate.getInstance("EscrowAccessSecretStoreTemplate", EscrowAccessSecretStoreTemplate)
    }

    public async getServiceAgreementTemplate() {
        return escrowAccessSecretStoreTemplateServiceAgreementTemplate
    }

    /**
     * Create a agreement using EscrowAccessSecretStoreTemplate.
     * @param {string}   agreementId    Generated agreement ID.
     * @param {string}   did            Asset DID.
     * @param {string[]} conditionIds   List of conditions IDs.
     * @param {number[]} timeLocks      Timelocks.
     * @param {number[]} timeOuts       Timeouts.
     * @param {string}   accessConsumer Consumer address.
     * @param {string}   from           Action sender.
     * @param {any}                     Transaction receipt.
     */
    public createAgreement(
        agreementId: string,
        did: string,
        conditionIds: string[],
        timeLocks: number[],
        timeOuts: number[],
        accessConsumer: string,
        from?: string,
    ) {
        return super.createAgreement(
            agreementId,
            did,
            conditionIds,
            timeLocks,
            timeOuts,
            [accessConsumer],
            from,
        )
    }

    /**
     * Create a agreement using EscrowAccessSecretStoreTemplate using only the most important information.
     * @param  {string}          did    Asset DID.
     * @param  {number}          amount Asset price.
     * @param  {string}          from   Consumer address.
     * @return {Promise<string>}        Agreement ID.
     */
    public async createFullAgreement(did: string, amount: number, from?: string): Promise<string> {
        from = await this.getFromAddress(from)

        const didRegistry = await DIDRegistry.getInstance()

        const accessSecretStoreCondition = await AccessSecretStoreCondition.getInstance()
        const lockRewardCondition = await LockRewardCondition.getInstance()
        const escrowReward = await EscrowReward.getInstance()

        const agreementId = zeroX(generateId())
        const publisher = await didRegistry.getDIDOwner(did)

        const conditionIdAccess = await accessSecretStoreCondition.generateIdHash(agreementId, did, from)
        const conditionIdLock = await lockRewardCondition.generateIdHash(agreementId, await escrowReward.getAddress(), amount)
        const conditionIdEscrow = await escrowReward.generateIdHash(
            agreementId,
            amount,
            from,
            publisher,
            conditionIdLock,
            conditionIdAccess,
        )

        await this.createAgreement(
            agreementId,
            did,
            [conditionIdAccess, conditionIdLock, conditionIdEscrow],
            [0, 0, 0],
            [0, 0, 0],
            from,
        )

        return agreementId
    }


    async getServiceAgreementTemplateValuesMap(ddo: DDO, agreementId: string, consumer: string): Promise<{[value: string]: string}> {
        const keeper = await Keeper.getInstance()
        const ddoOwner = ddo.proof && ddo.proof.creator
        const amount = ddo.findServiceByType("Metadata").metadata.base.price

        let lockCondition
        let releaseCondition

        try {
            lockCondition = await keeper.conditions.lockRewardCondition.hashValues(ddoOwner, amount)
        } catch(e) { }

        try {
            releaseCondition = await keeper.conditions.accessSecretStoreCondition.hashValues(ddo.shortId(), consumer)
        } catch(e) { }

        return {
            rewardAddress: ddoOwner,
            amount: amount.toString(),
            documentId: ddo.shortId(),
            grantee: consumer,
            receiver: consumer,
            sender: ddoOwner,
            lockCondition,
            releaseCondition,
        }
    }
}
