import pkg from '../package.json'

export const APP_VERSION = pkg.version

/** Bump when AgentPassport's shape changes in a way that requires migration. */
export const PASSPORT_SCHEMA_VERSION = 1
