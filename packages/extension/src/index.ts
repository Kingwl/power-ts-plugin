import * as vscode from 'vscode';
import axios from 'axios';
import type {
    GetArgumentPositionRequest,
    GetArgumentPositionResponse,
    GetInlayHintsRequest,
    GetInlayHintsResponse,
    PluginConfiguration
} from '@power-ts-plugin/shared';
import getPort from 'get-port';

function trim(str: string, charset: string) {
    const set = new Set(charset.split(''));
    let start = 0;
    let end = str.length;
    while (start < end && set.has(str[start])) {
        start++;
    }
    while (end > start && set.has(str[end - 1])) {
        end--;
    }
    return str.substring(start, end);
}

class InlayHintCodeLensProvider implements vscode.CodeLensProvider {
    constructor(private port: number) {}

    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ) {
        const req: GetInlayHintsRequest = {
            fileName: document.fileName,
            span: {
                start: 0,
                length: document.getText().length
            },
            preference: {
                includeInlayParameterNameHints: vscode.workspace
                    .getConfiguration('typescript.inlayHints')
                    .get('parameterNames.enabled')
            }
        };

        const cancelPromise = new Promise<never>((resolve, reject) => {
            token.onCancellationRequested(reject);
        });

        const resp = await Promise.race([
            axios.post<GetInlayHintsResponse>(
                `http://localhost:${this.port}/inlay-hints`,
                req
            ),
            cancelPromise
        ]);

        return resp.data.hints.map(hint => {
            const position = document.positionAt(hint.position);
            const line = document.lineAt(position.line);

            return new vscode.CodeLens(line.range, {
                title: trim(hint.text, ':'),
                command: 'power-ts-plugin.goto-parameter',
                arguments: [document.fileName, hint.position]
            });
        });
    }
}

const typeScriptExtensionId = 'vscode.typescript-language-features';
const pluginId = '@power-ts-plugin/plugin';
const defaultPort = 3264;

declare class ApiV0 {
    configurePlugin(pluginId: string, configuration: unknown): void;
}

interface Api {
    getAPI(version: 0): ApiV0 | undefined;
}

async function setupPluginConfiguration() {
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

const selectors = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact'
];

export async function activate(context: vscode.ExtensionContext) {
    const port = await setupPluginConfiguration();
    if (!port) {
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'power-ts-plugin.goto-parameter',
            async (fileName: string, position: number) => {
                const req: GetArgumentPositionRequest = {
                    fileName,
                    position
                };
                const resp = await axios.post<GetArgumentPositionResponse>(
                    `http://localhost:${port}/inlay-argument-position`,
                    req
                );
                const data = resp.data;
                if (!data.def) {
                    return vscode.window.showWarningMessage(
                        'No definition found.'
                    );
                }

                const uri = vscode.Uri.file(data.def.fileName);
                const doc = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(doc);

                const startPosition = doc.positionAt(data.def.pos);
                const endPosition = doc.positionAt(data.def.end);

                editor.revealRange(
                    new vscode.Range(startPosition, endPosition)
                );
                editor.selection = new vscode.Selection(
                    startPosition,
                    endPosition
                );
            }
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            selectors,
            new InlayHintCodeLensProvider(port)
        )
    );
}
