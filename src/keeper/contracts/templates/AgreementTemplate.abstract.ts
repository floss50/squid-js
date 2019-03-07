import ContractBase from "../ContractBase"
import { Condition } from "../conditions/Condition.abstract"
import Keeper from "../../Keeper"
import { ServiceAgreementTemplate, ServiceAgreementTemplateCondition } from '../../../ddo/ServiceAgreementTemplate'
import { zeroX } from "../../../utils"

export abstract class AgreementTemplate extends ContractBase {

    protected constructor(contractName: string) {
        super(contractName)
    }

    public static async getInstance(conditionName: string, templateClass: any): Promise<AgreementTemplate & any> {
        const condition: AgreementTemplate = new (templateClass as any)(conditionName)
        await condition.init()
        return condition
    }

    // tslint:disable-next-line
    public createAgreement(agreementId: string, did: string, conditionIds: string[], timeLocks: number[], timeOuts: number[], ...args: any[])
    public createAgreement(
        agreementId: string,
        did: string,
        conditionIds: string[],
        timeLocks: number[],
        timeOuts: number[],
        extraArgs: any[],
        from?: string,
    ) {
        return this.sendFrom(
            "createAgreement",
            [
                zeroX(agreementId),
                zeroX(did),
                conditionIds.map(zeroX),
                timeLocks,
                timeOuts,
                ...extraArgs,
            ],
            from,
        )
    }

    public getConditionTypes(): Promise<string[]> {
        return this.call("getConditionTypes", [])
    }

    public async getConditions(): Promise<Condition[]> {
        const keeper = await Keeper.getInstance()
        return (await this.getConditionTypes())
            .map(address => keeper.getConditionByAddress(address))

    }

    abstract getServiceAgreementTemplate(): Promise<ServiceAgreementTemplate>

    public async getServiceAgreementTemplateConditions(): Promise<ServiceAgreementTemplateCondition[]> {
        const serviceAgreementTemplate = await this.getServiceAgreementTemplate()
        return serviceAgreementTemplate.conditions
    }
}
