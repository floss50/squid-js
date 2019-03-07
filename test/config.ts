import { Config, LogLevel} from "../src/models/Config"

export default {
    aquariusUri: "http://localhost:5000",
    brizoUri: "http://localhost:3000",
    nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
    parityUri: "http://localhost:9545",
    secretStoreUri: "http://localhost:12001",
    verbose: LogLevel.Error,
} as Config
