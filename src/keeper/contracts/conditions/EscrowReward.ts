import { Condition } from "./Condition.abstract"

export class EscrowReward extends Condition {

    public static async getInstance(): Promise<EscrowReward> {
        return Condition.getInstance("EscrowReward", EscrowReward)
    }

    hashValues(amount: number, receiver: string, sender: string, lockCondition: string, releaseCondition: string) {
        return super.hashValues(amount, receiver, sender, lockCondition, releaseCondition)
    }

    fulfill(
        agreementId: string,
        amount: number,
        receiver: string,
        sender: string,
        lockCondition: string,
        releaseCondition: string,
        from?: string,
    ) {
        return super.fulfill(agreementId, [amount, receiver, sender, lockCondition, releaseCondition], from)
    }
}
