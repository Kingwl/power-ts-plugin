import * as vscode from 'vscode';
import { getArgumentPosition } from './api';

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
