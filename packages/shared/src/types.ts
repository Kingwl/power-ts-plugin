import type * as ts from 'typescript/lib/tsserverlibrary';

export interface GetInlayHintsRequest {
    fileName: string;
    span: ts.TextSpan;
    preference: ts.InlayHintsOptions | undefined;
}

export interface GetInlayHintsResponse {
    hints: ts.InlayHint[];
}

export interface GetArgumentPositionRequest {
    fileName: string;
    position: number;
}

export interface Def {
    fileName: string;
    pos: number;
    end: number;
}

export interface GetArgumentPositionResponse {
    def?: Def;
}

export interface PluginConfiguration {
    port: number;
}
