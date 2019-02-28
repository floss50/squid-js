import { Condition } from "./Condition.abstract"

export class AccessSecretStoreCondition extends Condition {

    public static async getInstance(): Promise<AccessSecretStoreCondition> {
        return Condition.getInstance("AccessSecretStoreCondition", AccessSecretStoreCondition)
    }

    hashValues(did: string, grantee: string) {
        return super.hashValues(did, grantee)
    }

    fulfill(agreementId: string, did: string, grantee: string, from?: string) {
        return super.fulfill(agreementId, [did, grantee], from)
    }
}
