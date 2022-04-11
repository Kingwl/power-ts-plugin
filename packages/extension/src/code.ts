import * as vscode from 'vscode';
import { getArgumentPosition, getInlayHints } from './api';
import { trim } from './utils';

export type GoToParamCommandArguments = [string, number];
export class GoToParamCommand implements vscode.Command {
    static ID = 'power-ts-plugin.goto-parameter';

    command = GoToParamCommand.ID;
    arguments: GoToParamCommandArguments;

    constructor(
        public title: string,
        public fileName: string,
        public position: number
    ) {
        this.arguments = [fileName, position];
    }

    static async run(port: number, ...args: GoToParamCommandArguments) {
        const [fileName, position] = args;
        const data = await getArgumentPosition(fileName, position, port);
        if (!data.def) {
            return vscode.window.showWarningMessage('No definition found.');
        }

        const uri = vscode.Uri.file(data.def.fileName);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);

        const startPosition = doc.positionAt(data.def.pos);
        const endPosition = doc.positionAt(data.def.end);

        editor.revealRange(new vscode.Range(startPosition, endPosition));
        editor.selection = new vscode.Selection(startPosition, endPosition);
    }
}

export class InlayHintCodeLensProvider implements vscode.CodeLensProvider {
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
