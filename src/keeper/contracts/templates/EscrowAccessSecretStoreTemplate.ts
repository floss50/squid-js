import { AgreementTemplate } from "./AgreementTemplate.abstract"

export class EscrowAccessSecretStoreTemplate extends AgreementTemplate {

    public static async getInstance(): Promise<EscrowAccessSecretStoreTemplate> {
        return AgreementTemplate.getInstance("EscrowAccessSecretStoreTemplate", EscrowAccessSecretStoreTemplate)
    }

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
}
