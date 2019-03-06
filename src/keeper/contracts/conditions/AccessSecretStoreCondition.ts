import { Condition } from "./Condition.abstract"
import { zeroX } from "../../../utils"

export class AccessSecretStoreCondition extends Condition {

    public static async getInstance(): Promise<AccessSecretStoreCondition> {
        return Condition.getInstance("AccessSecretStoreCondition", AccessSecretStoreCondition)
    }

    hashValues(did: string, grantee: string) {
        return super.hashValues(zeroX(did), zeroX(grantee))
    }

    fulfill(agreementId: string, did: string, grantee: string, from?: string) {
        return super.fulfill(agreementId, [did, grantee].map(zeroX), from)
    }

    checkPermissions(grantee: string, did: string, from?: string) {
        return this.call<boolean>("checkPermissions", [grantee, did].map(zeroX), from)
    }
}
