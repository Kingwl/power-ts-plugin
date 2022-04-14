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
    range: vscode.Range,
    port: number
) {
    const start = document.offsetAt(range.start);
    const end = document.offsetAt(range.end);
    const req: GetInlayHintsRequest = {
        fileName: document.fileName,
        span: {
            start,
            length: end - start
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
