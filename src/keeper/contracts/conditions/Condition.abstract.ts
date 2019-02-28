import ContractBase from "../ContractBase"

export enum ConditionState {
    Uninitialized = 0,
    Unfulfilled = 1,
    Fulfilled = 2,
    Aborted = 3,
}

export abstract class Condition extends ContractBase {

    protected constructor(contractName: string) {
        super(contractName)
    }

    public static async getInstance(conditionName: string, conditionsClass: any): Promise<Condition> {
        const condition: Condition = new (conditionsClass as any)(conditionName)
        await condition.init()
        return condition
    }


    hashValues(...args: any[]): Promise<string> {
        return this.call("hashValues", args)
    }

    fulfill(agreementId: string, ...args: any[]): Promise<ConditionState>
    fulfill(agreementId: string, args: any[], from?: string): Promise<ConditionState> {
        return this.sendFrom("fulfill", args, from)
    }

    async generateIdHash(agreementId: string, ...values: any[]): Promise<string> {
        return this.generateId(agreementId, await this.hashValues(...values))
    }

    generateId(agreementId: string, valueHash: string): Promise<string> {
        return this.call("generateId", [agreementId, valueHash])
    }

    abortByTimeOut(agreementId: string, from?: string): Promise<ConditionState> {
        return this.sendFrom("requestTokens", [agreementId], from)
    }
}
