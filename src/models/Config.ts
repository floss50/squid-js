import { LogLevel } from "../utils/Logger"
export { LogLevel } from "../utils/Logger"

export class Config {
    /* Aquarius Config */
    // the url to the aquarius
    public aquariusUri: string

    /* Brizo Config */
    // the url to the brizo
    public brizoUri: string

    /* Keeper Config */
    // the uri to the node we want to connect to, not need if web3Provider is set
    public nodeUri?: string
    // from outside eg. metamask
    public web3Provider?: any

    /* Secret Store Config */
    // the uri of the secret store to connect to
    public secretStoreUri: string
    // the uri of the parity node to connect to
    public parityUri: string
    // the password of the account in the local parity node to sign the serverKeyId
    public password: string
    // the address of the account in the local parity node to sign the serverKeyId
    public address: string
    // the number of nodes in the secret store that have to agree on changes
    public threshold: number

    /* Squid config */
    public verbose: boolean | LogLevel
}

export default Config
