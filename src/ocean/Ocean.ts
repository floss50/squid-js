import deprecated from "deprecated-decorator"

import OceanAccounts from "./OceanAccounts"
import OceanAgreements from "./OceanAgreements"
import OceanAssets from "./OceanAssets"
import OceanSecretStore from "./OceanSecretStore"
import OceanTokens from "./OceanTokens"

import AquariusProvider from "../aquarius/AquariusProvider"
import { SearchQuery } from "../aquarius/query/SearchQuery"
import BrizoProvider from "../brizo/BrizoProvider"
import ConfigProvider from "../ConfigProvider"
import { DDO } from "../ddo/DDO"
import { MetaData } from "../ddo/MetaData"
import { Service } from "../ddo/Service"
import ContractEvent from "../keeper/Event"
import Config from "../models/Config"
import SecretStoreProvider from "../secretstore/SecretStoreProvider"
import Logger, { LogLevel } from "../utils/Logger"
import Account from "./Account"
import DID from "./DID"
import ServiceAgreement from "./ServiceAgreements/ServiceAgreement"

import Keeper from "../keeper/Keeper"
import EventListener from "../keeper/EventListener"

/**
 * Main interface for Ocean Protocol.
 */
export default class Ocean {

    /**
     * Returns the instance of Ocean.
     * @param  {Config} config Ocean instance configuration.
     * @return {Promise<Ocean>}
     */
    public static async getInstance(config: Config): Promise<Ocean> {
        // Must be defined on instance level, right now, calling getInstance twice is going to rewrite that
        Logger.setLevel(
            typeof config.verbose !== "number"
                ? (config.verbose ? LogLevel.Log : LogLevel.None)
                : config.verbose as LogLevel,
        )
        ConfigProvider.setConfig(config)

        if (!Ocean.instance) {
            Ocean.instance = new Ocean()
            Ocean.instance.keeper = await Keeper.getInstance()
            Ocean.instance.accounts = await OceanAccounts.getInstance()
            Ocean.instance.assets = await OceanAssets.getInstance()
            Ocean.instance.agreements = await OceanAgreements.getInstance()
            Ocean.instance.secretStore = await OceanSecretStore.getInstance()
            Ocean.instance.tokens = await OceanTokens.getInstance()
        }

        return Ocean.instance
    }

    /**
     * Ocean instance.
     * @type {Ocean}
     */
    private static instance: Ocean = null

    /**
     * Keeper instance.
     * @type {Keeper}
     */
    public keeper: Keeper

    /**
     * Ocean account submodule
     * @type {OceanAccounts}
     */
    public accounts: OceanAccounts

    /**
     * Ocean assets submodule
     * @type {OceanAssets}
     */
    public assets: OceanAssets

    /**
     * Ocean agreements submodule
     * @type {OceanAgreements}
     */
    public agreements: OceanAgreements

    /**
     * Ocean secretStore submodule
     * @type {OceanSecretStore}
     */
    public secretStore: OceanSecretStore

    /**
     * Ocean tokens submodule
     * @type {OceanTokens}
     */
    public tokens: OceanTokens

    private constructor() { }

    /**
     * Returns the list of accounts.
     * @deprecated Replace by [Ocean.accounts.list]{@link #OceanAccounts.list}
     * @return {Promise<Account[]>}
     */
    @deprecated("OceanAccounts.list")
    public async getAccounts(): Promise<Account[]> {
        return await this.accounts.list()
    }

    /**
     * Returns a DDO by DID.
     * @deprecated Replace by [Ocean.assets.resolve]{@link #OceanAssets.resolve}
     * @param  {string} did Decentralized ID.
     * @return {Promise<DDO>}
     */
    @deprecated("OceanAssets.resolve")
    public async resolveDID(did: string): Promise<DDO> {
        return await this.assets.resolve(did)
    }

    /**
     * Returns a DDO by DID.
     * @deprecated Replace by [Ocean.assets.resolve]{@link #OceanAssets.resolve}
     * @param  {string} did Decentralized ID.
     * @return {Promise<DDO>}
     */
    @deprecated("OceanAssets.resolve")
    public async resolveAssetDID(did: string): Promise<DDO> {
        return await this.assets.resolve(did)
    }

    /**
     * Registers a new DDO.
     * @deprecated Replace by [Ocean.assets.create]{@link #OceanAssets.create}
     * @param  {MetaData} metadata DDO metadata.
     * @param  {Account} publisher Publisher account.
     * @return {Promise<DDO>}
     */
    @deprecated("OceanAssets.create")
    public async registerAsset(metadata: MetaData, publisher: Account, services?: Service[]): Promise<DDO> {
        return await this.assets.create(metadata, publisher, services)
    }

    /**
     * Signs a service agreement by DID.
     * @deprecated Replace by [Ocean.agreement.prepare]{@link #OceanAgreement.prepare}
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {Account} consumer Consumer account.
     * @return {Promise<any>}
     *
     */
    @deprecated("OceanAgreement.prepare")
    public async signServiceAgreement(
        did: string,
        serviceDefinitionId: string,
        consumer: Account,
    ) {
        return await this.agreements.prepare(did, serviceDefinitionId, consumer)
    }

    /**
     * Signs a service agreement by DID.
     * @deprecated Replace by [Ocean.assets.order]{@link #OceanAssets.order}
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {Account} consumer Consumer account.
     * @return {Promise<any>}
     */
    @deprecated("OceanAssets.order")
    public async purchaseAssetService(
        did: string,
        serviceDefinitionId: string,
        consumer: Account,
    ): Promise<any> {
        return await this.assets.order(did, serviceDefinitionId, consumer)
    }

    /**
     * Creates a new service agreement.
     * @deprecated Replace by [Ocean.assets.consume]{@link #OceanAssets.consume}
     * @param {string} did Decentralized ID.
     * @param {string} serviceDefinitionId Service definition ID.
     * @param {string} serviceAgreementId Service agreement ID.
     * @param {string} serviceAgreementSignature Service agreement signature.
     * @param {Function} cb Callback executen when the access is granted.
     * @param {Account} consumer Consumer account.
     */
    @deprecated("OceanAssets.consume")
    public async initializeServiceAgreement(
        did: string,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        serviceAgreementSignature: string,
        cb: (files: string[]) => void,
        consumer: Account,
    ) {
        return await this.assets.consume(serviceAgreementId, did, serviceDefinitionId, consumer)
    }

    /**
     * Executes a service agreement.
     * @deprecated Replace by [Ocean.agreements.create]{@link #OceanAgreements.create}
     * @param  {string} did Decentralized ID.
     * @param  {string} serviceDefinitionId Service definition ID.
     * @param  {string} serviceAgreementId Service agreement ID.
     * @param  {string} serviceAgreementSignature Service agreement signature.
     * @param  {Account} consumer Consumer account.
     * @param  {Account} publisher Publisher account.
     * @return {Promise<ServiceAgreement>}
     */
    @deprecated("OceanAgreements.create")
    public async executeServiceAgreement(
        did: string,
        serviceDefinitionId: string,
        serviceAgreementId: string,
        serviceAgreementSignature: string,
        consumer: Account,
        publisher: Account,
    ): Promise<ServiceAgreement> {
        return await this.agreements
            .create(did,
                serviceDefinitionId,
                serviceAgreementId,
                serviceAgreementSignature,
                consumer,
                publisher,
            )
    }

    /**
     * Search over the assets using a query.
     * @deprecated Replace by [Ocean.assets.query]{@link #OceanAssets.query}
     * @param  {SearchQuery} query Query to filter the assets.
     * @return {Promise<DDO[]>}
     */
    @deprecated("OceanAssets.query")
    public async searchAssets(query: SearchQuery): Promise<DDO[]> {
        return await this.assets.query(query)
    }

    /**
     * Search over the assets using a keyword.
     * @deprecated Replace by [Ocean.assets.search]{@link #OceanAssets.search}
     * @param  {string} text Text to filter the assets.
     * @return {Promise<DDO[]>}
     */
    @deprecated("OceanAssets.search")
    public async searchAssetsByText(text: string): Promise<DDO[]> {
        return await this.assets.search(text)
    }
}
