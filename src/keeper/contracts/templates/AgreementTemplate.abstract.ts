import ContractBase from "../ContractBase"
import { Condition } from "../conditions/Condition.abstract"
import Keeper from "../../Keeper"

export abstract class AgreementTemplate extends ContractBase {

    protected constructor(contractName: string) {
        super(contractName)
    }

    public static async getInstance(conditionName: string, templateClass: any): Promise<AgreementTemplate> {
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
                agreementId,
                did,
                conditionIds,
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
}
