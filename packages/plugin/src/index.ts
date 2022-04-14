import type * as ts from 'typescript/lib/tsserverlibrary';
import 'open-typescript';

import express from 'express';
import * as http from 'http';
import type {
    GetArgumentPositionRequest,
    GetArgumentPositionResponse,
    GetInlayHintsRequest,
    GetInlayHintsResponse,
    PluginConfiguration
} from '@power-ts-plugin/shared';
import { getDefinitionForInlayHintsArgumentPosition } from './service';

const LanguageServiceModeSemantic = 0;

type GetArgumentPositionWorker = (
    req: GetArgumentPositionRequest
) => GetArgumentPositionResponse;
type GetInlayHintsWorker = (req: GetInlayHintsRequest) => GetInlayHintsResponse;

const factory: ts.server.PluginModuleFactory = mod => {
    let server: http.Server | undefined;
    let start: ((port: number) => void) | undefined;

    return {
        create(info) {
            if (
                info.project.projectService.serverMode !==
                LanguageServiceModeSemantic
            ) {
                return info.languageService;
            }

            const config = info.config as
                | Partial<PluginConfiguration>
                | undefined;

            const app = express();
            app.use(express.json());

            const oldProvideInlayHints = info.languageService.provideInlayHints;
            const getInlayHints = oldProvideInlayHints.bind(
                info.languageService
            );

            const getInlayHintsWorker: GetInlayHintsWorker = req => {
                const hints = getInlayHints(
                    req.fileName,
                    req.span,
                    req.preference
                );

                return {
                    hints
                };
            };
            app.post('/inlay-hints', (req, res) => {
                const body = req.body as GetInlayHintsRequest;
                try {
                    const response = getInlayHintsWorker(body);
                    res.send(response);
                } catch {
                    res.status(500).send({});
                }
            });

            const getArgumentPositionWorker: GetArgumentPositionWorker =
                req => {
                    const program = info.languageService.getProgram();
                    if (!program) {
                        return {};
                    }

                    const definitionInfo =
                        getDefinitionForInlayHintsArgumentPosition(
                            req.fileName,
                            req.position,
                            program,
                            mod.typescript
                        );

                    if (!definitionInfo) {
                        return {};
                    }

                    return {
                        def: {
                            fileName: definitionInfo.fileName,
                            pos: definitionInfo.pos,
                            end: definitionInfo.end
                        }
                    };
                };

            app.post('/inlay-argument-position', (req, res) => {
                try {
                    const body = req.body as GetArgumentPositionRequest;
                    const response = getArgumentPositionWorker(body);
                    res.send(response);
                } catch {
                    res.status(500).send({});
                }
            });

            start = port => {
                server?.close();
                server = app.listen(port, () => {
                    console.log(`Power TS Plugin listening on port ${port}`);
                });
            };

            if (config?.port) {
                start(config.port);
            }

            return {
                ...info.languageService,
                provideInlayHints(...args) {
                    if (server) {
                        return [];
                    }

                    return getInlayHints(...args);
                }
            };
        },
        onConfigurationChanged(config: Partial<PluginConfiguration>) {
            if (config.port && start) {
                start(config.port);
            }
        }
    };
};

export = factory;
