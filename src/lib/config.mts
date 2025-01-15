/*
 * Unofficial Shlink extension for one-click link shortening.
 * Copyright (C) 2025 Edward Shen
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { type Storage } from "webextension-polyfill";

type DeepRequired<T> = { [K in keyof T]-?: DeepRequired<T[K]> };

type ButtonOption = "create" | "modify";

interface StorageAreaShlinkConfig {
  // The API key to communicate with a Shlink instance with.
  shlinkApiKey?: string;
  // The location of the Shlink instance.
  shlinkHost?: string;
  shlinkButtonOption?: ButtonOption;
  createOptions?: CreateOptions;
  modifyOptions?: ModifyOptions;
  allowedProtocols?: Array<string>;
}

interface CreateOptions {
  findIfExists?: boolean;
  tagShortUrl?: boolean;
}

interface ModifyOptions {
  shortUrl?: string;
}

const DEFAULT: DeepRequired<StorageAreaShlinkConfig> = {
  shlinkApiKey: "",
  shlinkHost: "",
  shlinkButtonOption: "create",
  createOptions: {
    findIfExists: true,
    tagShortUrl: true,
  },
  modifyOptions: {
    shortUrl: "",
  },
  allowedProtocols: ["http:", "https:", "ftp:", "file:"],
};

// The public version of Shlink Config. In practice, everything should be defined
// because all interfaces are not nullable and initialize the value
interface ShlinkConfig
  extends Omit<DeepRequired<StorageAreaShlinkConfig>, "allowedProtocols"> {
  allowedProtocols: Set<string>;
}

// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set#keys
// TODO: Figure out how manually not have to specify all nested objects
// Unfortunately setting object here is worse as it permits any object including illegal ones
type StorageAreaType =
  | string
  | number
  | boolean
  | Array<StorageAreaType>
  | CreateOptions
  | ModifyOptions;

class ConfigManager {
  #storage: Storage.StorageArea;

  constructor(storage: Storage.StorageArea) {
    this.#storage = storage;
  }

  async #loadStorage(args?: any): Promise<StorageAreaShlinkConfig> {
    return (await this.#storage.get(
      args,
    )) as unknown as StorageAreaShlinkConfig;
  }

  async #setStorage<T extends StorageAreaType>(
    key: keyof StorageAreaShlinkConfig,
    value: T,
  ) {
    await this.#storage.set({
      [key]: value,
    });
  }

  async #getOrInit<Type extends StorageAreaType>(
    fieldName: keyof StorageAreaShlinkConfig,
    defaultValue: Type,
  ): Promise<Type> {
    // In theory something like this should also functionally be identical
    // But I would rather persist this
    // return (await this.#loadStorage({ [fieldName]: defaultValue }))[fieldName] as Type;

    const key = (await this.#loadStorage())[fieldName] as Type;
    if (key) {
      return key;
    } else {
      await this.#setStorage(fieldName, defaultValue);
      return defaultValue;
    }
  }

  #getFactoryMapped<RawType extends StorageAreaType, MappedType>(
    fieldName: keyof StorageAreaShlinkConfig,
    defaultValue: RawType,
    mapFn: (rawType: RawType) => MappedType,
  ): () => Promise<MappedType> {
    return () => this.#getOrInit(fieldName, defaultValue).then(mapFn);
  }

  #getFactory<K extends keyof StorageAreaShlinkConfig>(
    fieldName: K,
  ): () => Promise<DeepRequired<StorageAreaShlinkConfig>[K]> {
    return this.#getFactoryMapped(fieldName, DEFAULT[fieldName], (t) => t);
  }

  #mapFactory<GetOut, SetIn>(
    get: () => Promise<GetOut>,
    set: (_: SetIn) => void,
  ): (_: (_: GetOut) => SetIn) => Promise<void> {
    return (f: (_: GetOut) => SetIn) =>
      get()
        .then(async (v) => f(v))
        .then(set);
  }

  #setFactoryMapped<RawType extends StorageAreaType, MappedType>(
    fieldName: keyof StorageAreaShlinkConfig,
    mapFn: (rawType: MappedType) => RawType,
  ): (mapped: MappedType) => void {
    return (arg: MappedType) => this.#setStorage(fieldName, mapFn(arg));
  }

  #setFactory<RawType extends StorageAreaType>(
    fieldName: keyof StorageAreaShlinkConfig,
  ): (mapped: RawType) => void {
    return this.#setFactoryMapped(fieldName, (t) => t);
  }

  // Type hints aren't necessary but I find them very helpful.

  // Getters

  async get(): Promise<ShlinkConfig> {
    // TODO: Figure out how to reduce duplication
    const config: ShlinkConfig = {
      shlinkApiKey: await this.getApiKey(),
      shlinkHost: await this.getHost(),
      shlinkButtonOption: await this.getButtonOption(),
      createOptions: await this.getCreateOptions(),
      modifyOptions: await this.getModifyOptions(),
      allowedProtocols: await this.getAllowedProtocols(),
    };
    return config;
  }

  getApiKey: () => Promise<string> = this.#getFactory("shlinkApiKey");
  getHost: () => Promise<string> = this.#getFactory("shlinkHost");
  getButtonOption: () => Promise<ButtonOption> =
    this.#getFactory("shlinkButtonOption");
  getCreateOptions: () => Promise<Required<CreateOptions>> =
    this.#getFactory("createOptions");
  getModifyOptions: () => Promise<Required<ModifyOptions>> =
    this.#getFactory("modifyOptions");
  getAllowedProtocols: () => Promise<Set<string>> = this.#getFactoryMapped(
    "allowedProtocols",
    Array(...DEFAULT["allowedProtocols"]),
    (items) => new Set(items),
  );

  // Setters

  setApiKey: (key: string) => void = this.#setFactory("shlinkApiKey");
  setHost: (host: string) => void = this.#setFactory("shlinkHost");
  setButtonOption: (option: string) => void =
    this.#setFactory("shlinkButtonOption");
  setCreateOptions: (options: CreateOptions) => void =
    this.#setFactory("createOptions");
  setModifyOptions: (options: ModifyOptions) => void =
    this.#setFactory("modifyOptions");
  setAllowedProtocols: (procotols: Set<string>) => void =
    this.#setFactoryMapped("allowedProtocols", (items) => new Array(...items));

  mapCreateOptions = this.#mapFactory(
    this.getCreateOptions,
    this.setCreateOptions,
  );
  mapModifyOptions = this.#mapFactory(
    this.getModifyOptions,
    this.setModifyOptions,
  );
  mapAllowedProtocols = this.#mapFactory(
    this.getAllowedProtocols,
    this.setAllowedProtocols,
  );
}

export type { CreateOptions, ModifyOptions, ShlinkConfig };
export { ConfigManager };
