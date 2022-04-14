import * as ts from 'typescript/lib/tsserverlibrary';
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

const LanguageServiceModeSemantic = 0;

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

            app.post('/inlay-hints', (req, res) => {
                const body = req.body as GetInlayHintsRequest;
                const hints = getInlayHints(
                    body.fileName,
                    body.span,
                    body.preference
                );
                const result: GetInlayHintsResponse = {
                    hints
                };
                res.send(result);
            });

            function getDefinitionForInlayHintsArgumentPosition(
                fileName: string,
                position: number
            ) {
                const program = info.languageService.getProgram();
                const file = program?.getSourceFile(fileName);

                if (!program || !file) {
                    return undefined;
                }

                const realArgumentPosition = position + 1;
                const argumentToken = ts.getTokenAtPosition(
                    file,
                    realArgumentPosition
                );
                const argumentExpression = ts.findAncestor(
                    argumentToken,
                    node => {
                        return (
                            mod.typescript.isCallExpression(node.parent) &&
                            mod.typescript.rangeContainsRange(
                                node.parent.arguments,
                                node
                            )
                        );
                    }
                );
                if (
                    !argumentExpression ||
                    !mod.typescript.isExpression(argumentExpression) ||
                    !mod.typescript.isCallExpression(argumentExpression.parent)
                ) {
                    return undefined;
                }
                const argumentPosition =
                    argumentExpression.parent.arguments.indexOf(
                        argumentExpression
                    );
                if (argumentPosition === -1) {
                    return undefined;
                }

                const checker = program?.getTypeChecker();
                if (!checker) {
                    return undefined;
                }

                const signature = checker.getResolvedSignature(
                    argumentExpression.parent
                );
                if (!signature) {
                    return undefined;
                }
                const symbol = signature.parameters[argumentPosition];
                if (!symbol?.valueDeclaration) {
                    return undefined;
                }

                const sourceFile = symbol.valueDeclaration.getSourceFile();
                return {
                    fileName: sourceFile.fileName,
                    pos: symbol.valueDeclaration.pos,
                    end: symbol.valueDeclaration.end
                };
            }

            app.post('/inlay-argument-position', (req, res) => {
                const body = req.body as GetArgumentPositionRequest;
                const definitionInfo =
                    getDefinitionForInlayHintsArgumentPosition(
                        body.fileName,
                        body.position
                    );

                if (!definitionInfo) {
                    const result: GetArgumentPositionResponse = {};
                    return res.send(result);
                }

                const result: GetArgumentPositionResponse = {
                    def: {
                        fileName: definitionInfo.fileName,
                        pos: definitionInfo.pos,
                        end: definitionInfo.end
                    }
                };
                res.send(result);
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
