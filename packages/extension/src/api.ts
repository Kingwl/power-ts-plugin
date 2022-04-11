import type {
    GetArgumentPositionRequest,
    GetArgumentPositionResponse,
    GetInlayHintsRequest,
    GetInlayHintsResponse
} from '@power-ts-plugin/shared';
import axios from 'axios';
import * as vscode from 'vscode';

export async function getInlayHints(
    document: vscode.TextDocument,
    port: number
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

    const result = await axios.post<GetInlayHintsResponse>(
        `http://localhost:${port}/inlay-hints`,
        req
    );
    return result.data;
}

export async function getArgumentPosition(
    fileName: string,
    position: number,
    port: number
) {
    const req: GetArgumentPositionRequest = {
        fileName,
        position
    };
    const resp = await axios.post<GetArgumentPositionResponse>(
        `http://localhost:${port}/inlay-argument-position`,
        req
    );
    return resp.data;
}
