import type { Def } from '@power-ts-plugin/shared';
import type * as ts from 'typescript/lib/tsserverlibrary';

export function getDefinitionForInlayHintsArgumentPosition(
    fileName: string,
    position: number,
    program: ts.Program,
    typescript: typeof ts
): Def | undefined {
    const file = program.getSourceFile(fileName);
    if (!file) {
        return undefined;
    }

    const realArgumentPosition = position + 1;
    const argumentToken = typescript.getTokenAtPosition(
        file,
        realArgumentPosition
    );
    const argumentExpression = typescript.findAncestor(argumentToken, node => {
        return (
            typescript.isCallExpression(node.parent) &&
            typescript.rangeContainsRange(node.parent.arguments, node)
        );
    });
    if (
        !argumentExpression ||
        !typescript.isExpression(argumentExpression) ||
        !typescript.isCallExpression(argumentExpression.parent)
    ) {
        return undefined;
    }
    const argumentPosition =
        argumentExpression.parent.arguments.indexOf(argumentExpression);
    if (argumentPosition === -1) {
        return undefined;
    }

    const checker = program.getTypeChecker();
    if (!checker) {
        return undefined;
    }

    const signature = checker.getResolvedSignature(argumentExpression.parent);
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
