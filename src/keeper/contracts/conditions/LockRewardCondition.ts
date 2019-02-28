import { Condition } from "./Condition.abstract"

export class LockRewardCondition extends Condition {

    public static async getInstance(): Promise<LockRewardCondition> {
        return Condition.getInstance("LockRewardCondition", LockRewardCondition)
    }

    hashValues(rewardAddress: string, amount: number) {
        return super.hashValues(rewardAddress, amount)
    }

    fulfill(agreementId: string, rewardAddress: string, amount: number, from?: string) {
        return super.fulfill(agreementId, [rewardAddress, amount], from)
    }
}
