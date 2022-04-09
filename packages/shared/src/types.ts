import type * as ts from 'typescript/lib/tsserverlibrary';

export interface GetInlayHintsRequest {
    fileName: string;
    span: ts.TextSpan;
    preference: ts.InlayHintsOptions | undefined;
}

export interface GetInlayHintsResponse {
    hints: ts.InlayHint[];
}
