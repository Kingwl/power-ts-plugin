import { Def } from '@power-ts-plugin/shared';
import * as vscode from 'vscode';
import { getArgumentPosition, getInlayHints } from './api';
import { runWithCancelToken, trim } from './utils';

export type GoToParamCommandArguments = [
    filename: string,
    pos: number,
    end: number
];
export class GoToParamCommand implements vscode.Command {
    static ID = 'power-ts-plugin.goto-parameter';

    command = GoToParamCommand.ID;
    arguments: GoToParamCommandArguments;

    constructor(public title: string, public def: Def) {
        this.arguments = [def.fileName, def.pos, def.end];
    }

    static async run(...args: GoToParamCommandArguments) {
        const [fileName, pos, end] = args;
        const uri = vscode.Uri.file(fileName);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);

        const startPosition = doc.positionAt(pos);
        const endPosition = doc.positionAt(end);

        editor.revealRange(
            new vscode.Range(startPosition, endPosition),
            vscode.TextEditorRevealType.AtTop
        );
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
        const resp = await runWithCancelToken(token, () =>
            getInlayHints(document, range, this.port)
        );

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
        const result = await runWithCancelToken(token, () =>
            getArgumentPosition(hint.fileName, offset, this.port)
        );
        if (!result.def) {
            return hint;
        }

        part.command = new GoToParamCommand(trim(hint.label, ':'), result.def);

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
