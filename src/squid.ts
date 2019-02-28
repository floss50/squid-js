import Config from "./models/Config"
import Account from "./ocean/Account"
import DID from "./ocean/DID"
import Ocean from "./ocean/Ocean"
import Logger from "./utils/Logger"
import WebServiceConnectorProvider from "./utils/WebServiceConnectorProvider"
import Keeper from "./keeper/Keeper"
import EventListener from "./keeper/EventListener"

import * as templates from "./keeper/contracts/templates"
import * as conditions from "./keeper/contracts/conditions"

// Exports
export * from "./ddo/DDO"
export * from "./ddo/MetaData"
export { generateId } from "./utils/GeneratorHelpers"

export { AgreementTemplate } from "./keeper/contracts/templates"
export { Condition } from "./keeper/contracts/conditions"

export {
    Ocean,

    Account,
    Config,
    DID,
    EventListener,
    Keeper,
    Logger,
    WebServiceConnectorProvider,

    conditions,
    templates,
}
