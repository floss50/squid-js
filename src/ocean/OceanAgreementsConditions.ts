import Keeper from "../keeper/Keeper"
import Account from "./Account"

/**
 * Agreements Conditions submodule of Ocean Protocol.
 */
export default class OceanAgreementsConditions {

    /**
     * Returns the instance of OceanAgreementsConditions.
     * @return {Promise<OceanAgreementsConditions>}
     */
    public static async getInstance(): Promise<OceanAgreementsConditions> {
        if (!OceanAgreementsConditions.instance) {
            OceanAgreementsConditions.instance = new OceanAgreementsConditions()
            OceanAgreementsConditions.instance.keeper = await Keeper.getInstance()
        }

        return OceanAgreementsConditions.instance
    }

    /**
     * OceanAgreementsConditions instance.
     * @type {OceanAgreementsConditions}
     */
    private static instance: OceanAgreementsConditions = null

    private keeper: Keeper

    /**
     * Transfers tokens to the EscrowRewardCondition contract as an escrow payment.
     * This is required before access can be given to the asset data.
     * @param {string}  agreementId Agreement ID.
     * @param {number}  amount      Asset amount.
     * @param {Account} from        Account of sender.
     */
    public async lockReward(agreementId: string, amount: number, from: Account = new Account()) {
        const {lockRewardCondition, escrowReward} = this.keeper.conditions

        await this.keeper.token.approve(lockRewardCondition.getAddress(), amount, from.getId())

        return await lockRewardCondition.fulfill(agreementId, escrowReward.getAddress(), amount, from.getId())
    }


    /**
     * Authorize the consumer defined in the agreement to access (consume) this asset.
     * @param {string}  agreementId Agreement ID.
     * @param {string}  did         Asset ID.
     * @param {string}  grantee     Consumer address.
     * @param {Account} from        Account of sender.
     */
    public async grantAccess(agreementId: string, did: string, grantee: string, from: Account = new Account()) {
        const {accessSecretStoreCondition} = this.keeper.conditions

        return await accessSecretStoreCondition.fulfill(agreementId, did, grantee, from.getId())
    }

    /**
     * Transfer the escrow or locked tokens from the LockRewardCondition contract to the publisher's account.
     * This should be allowed after access has been given to the consumer and the asset data is downloaded.
     *
     * If the AccessSecretStoreCondition already timed out, this function will do a refund by transferring
     * the token amount to the original consumer.
     * @param {string}  agreementId Agreement ID.
     * @param {number}  amount      Asset amount.
     * @param {string}  did         Asset ID.
     * @param {string}  consumer    Consumer address.
     * @param {string}  publisher   Publisher address.
     * @param {Account} from        Account of sender.
     */
    public async releaseReward(
        agreementId: string,
        amount: number,
        did: string,
        consumer: string,
        publisher: string,
        from: Account = new Account(),
    ) {
        const {escrowReward, accessSecretStoreCondition, lockRewardCondition} = this.keeper.conditions

        const conditionIdAccess = await accessSecretStoreCondition.generateIdHash(agreementId, did, consumer)
        const conditionIdLock = await lockRewardCondition.generateIdHash(agreementId, await escrowReward.getAddress(), amount)

        return await escrowReward.fulfill(
            agreementId,
            amount,
            consumer,
            publisher,
            conditionIdLock,
            conditionIdAccess,
            from.getId(),
        )
    }
}
