import * as vscode from 'vscode';
import { configPluginConfiguration } from './connection';
import { selectors } from './constants';
import {
    GoToParamCommand,
    GoToParamCommandArguments,
    InlayHintProvider
} from './code';

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
        vscode.languages.registerInlayHintsProvider(
            selectors,
            new InlayHintProvider(port)
        )
    );
}
