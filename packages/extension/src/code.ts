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

class InlayHintsWithFileName extends vscode.InlayHint {
    /**
     * Creates a new inlay hint.
     *
     * @param fileName The file name of the hint.
     * @param position The position of the hint.
     * @param label The label of the hint.
     * @param kind The {@link InlayHintKind kind} of the hint.
     */
    constructor(
        public fileName: string,
        position: vscode.Position,
        label: string | vscode.InlayHintLabelPart[],
        kind?: vscode.InlayHintKind
    ) {
        super(position, label, kind);
    }
}

export class InlayHintProvider
    implements vscode.InlayHintsProvider<InlayHintsWithFileName>
{
    constructor(private port: number) {}

    async provideInlayHints(
        document: vscode.TextDocument,
        range: vscode.Range,
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
            const inlayHint = new InlayHintsWithFileName(
                document.fileName,
                position,
                hint.text,
                vscode.InlayHintKind.Parameter
            );
            inlayHint.paddingLeft = hint.whitespaceBefore;
            inlayHint.paddingRight = hint.whitespaceAfter;
            return inlayHint;
        });
    }

    async resolveInlayHint(
        hint: InlayHintsWithFileName,
        token: vscode.CancellationToken
    ) {
        if (typeof hint.label !== 'string') {
            return hint;
        }

        const part = new vscode.InlayHintLabelPart(hint.label);
        const document = await vscode.workspace.openTextDocument(
            vscode.Uri.file(hint.fileName)
        );
        const offset = document.offsetAt(hint.position);

        part.command = new GoToParamCommand(
            trim(hint.label, ':'),
            document.fileName,
            offset
        );

        const newHint = new InlayHintsWithFileName(
            hint.fileName,
            hint.position,
            [part],
            hint.kind
        );
        newHint.paddingLeft = hint.paddingLeft;
        newHint.paddingRight = hint.paddingRight;
        newHint.tooltip = `Go to definition`;

        return newHint;
    }
}
