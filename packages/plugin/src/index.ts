import type * as ts from 'typescript/lib/tsserverlibrary';
import express from 'express';
import * as http from 'http';
import type {
    GetInlayHintsRequest,
    GetInlayHintsResponse
} from '@power-ts-plugin/shared';

const PORT = 3264;
const LanguageServiceModeSemantic = 0;

const factory: ts.server.PluginModuleFactory = () => {
    let server: http.Server | undefined;

    return {
        create(info) {
            if (
                info.project.projectService.serverMode !==
                LanguageServiceModeSemantic
            ) {
                return info.languageService;
            }

            server?.close();
            const app = express();
            app.use(express.json());

            app.post('/inlay-hints', (req, res) => {
                const body = req.body as GetInlayHintsRequest;
                const hints = info.languageService.provideInlayHints(
                    body.fileName,
                    body.span,
                    body.preference
                );
                const result: GetInlayHintsResponse = {
                    hints
                };
                res.send(result);
            });

            app.listen(PORT);
            return info.languageService;
        }
    };
};

export = factory;
