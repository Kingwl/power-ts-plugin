import type { PluginConfiguration } from '@power-ts-plugin/shared';
import getPort from 'get-port';
import * as vscode from 'vscode';
import { pluginId, typeScriptExtensionId } from './constants';

declare class ApiV0 {
    configurePlugin(pluginId: string, configuration: unknown): void;
}

interface Api {
    getAPI(version: 0): ApiV0 | undefined;
}

export async function configPluginConfiguration(defaultPort: number) {
    const extension = vscode.extensions.getExtension(typeScriptExtensionId);
    if (!extension) {
        return undefined;
    }

    await extension.activate();
    const extApi = extension.exports as Api | undefined;
    if (!extApi?.getAPI) {
        return undefined;
    }

    const api = extApi.getAPI(0);
    if (!api) {
        return undefined;
    }

    const port = await getPort({
        port: defaultPort
    });
    const configuration: PluginConfiguration = {
        port
    };
    api.configurePlugin(pluginId, configuration);
    return port;
}
