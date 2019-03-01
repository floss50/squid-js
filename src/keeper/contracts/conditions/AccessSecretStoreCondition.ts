import { Condition } from "./Condition.abstract"

export class AccessSecretStoreCondition extends Condition {

    public static async getInstance(): Promise<AccessSecretStoreCondition> {
        return Condition.getInstance("AccessSecretStoreCondition", AccessSecretStoreCondition) as any
    }

    hashValues(did: string, grantee: string) {
        return super.hashValues(did, grantee)
    }

    fulfill(agreementId: string, did: string, grantee: string, from?: string) {
        return super.fulfill(agreementId, [did, grantee], from)
    }

    checkPermissions(grantee: string, did: string, from?: string) {
        return this.call<boolean>("checkPermissions", [grantee, did], from)
    }
}
