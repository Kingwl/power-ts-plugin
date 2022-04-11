import * as vscode from 'vscode';
import { getInlayHints } from './api';
import { trim } from './utils';
import { configPluginConfiguration } from './connection';
import { selectors } from './constants';
import { GoToParamCommand, GoToParamCommandArguments } from './code';

class InlayHintCodeLensProvider implements vscode.CodeLensProvider {
    constructor(private port: number) {}

    async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ) {
        const cancelPromise = new Promise<never>((_, reject) => {
            token.onCancellationRequested(reject);
        });

        const resp = await Promise.race([
            getInlayHints(document, this.port),
            cancelPromise
        ]);

        return resp.hints.map(hint => {
            const position = document.positionAt(hint.position);
            const line = document.lineAt(position.line);

            return new vscode.CodeLens(
                line.range,
                new GoToParamCommand(
                    trim(hint.text, ':'),
                    document.fileName,
                    hint.position
                )
            );
        });
    }
}

const defaultPort = 3264;

export async function activate(context: vscode.ExtensionContext) {
    const port = await configPluginConfiguration(defaultPort);
    if (!port) {
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand(
            GoToParamCommand.ID,
            async (...args: GoToParamCommandArguments) => {
                GoToParamCommand.run(port, ...args);
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
