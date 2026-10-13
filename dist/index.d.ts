export { generate, type GenerateOptions } from './generate.js';
export { Documentation, FORMAT_VERSION, type DocumentationOptions } from './documentation/documentation.js';
export { splitVarName } from './documentation/var-type.js';
export { loadCustomDocs, type CustomDocsCategoryDefinition, type CustomDocsFileDefinition, type LoadedCustomDocs } from './custom.js';
export { consoleLogger, silentLogger, type Logger } from './logger.js';
export { version } from './version.js';
export type * from './documentation/types.js';
