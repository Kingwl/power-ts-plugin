import * as vscode from 'vscode';
import axios from 'axios';
import type {
    GetInlayHintsRequest,
    GetInlayHintsResponse
} from '@power-ts-plugin/shared';

const PORT = 3264;

class InlayHintCodeLensProvider implements vscode.CodeLensProvider {
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
                `http://localhost:${PORT}/inlay-hints`,
                req
            ),
            cancelPromise
        ]);

        return resp.data.hints.map(hint => {
            const position = document.positionAt(hint.position);
            const line = document.lineAt(position.line);

            return new vscode.CodeLens(line.range, {
                title: hint.text,
                command: 'extension.inlayHint'
            });
        });
    }
}

const selectors = [
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact'
];

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            selectors,
            new InlayHintCodeLensProvider()
        )
    );
}
