const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const emptyNodeModule = path.resolve(__dirname, "shims/emptyNodeModule.js");
const unsupportedNodeModules = new Set(["fs", "path", "readline-sync"]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
    const importedByTauProlog = context.originModulePath?.includes(
        `${path.sep}node_modules${path.sep}tau-prolog${path.sep}`
    );

    if (importedByTauProlog && unsupportedNodeModules.has(moduleName)) {
        return context.resolveRequest(context, emptyNodeModule, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
