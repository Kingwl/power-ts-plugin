import { build } from 'esbuild';
import * as path from 'path';

build({
    entryPoints: [path.resolve(__dirname, '../src/index.ts')],
    bundle: true,
    outdir: path.resolve(__dirname, '../dist'),
    platform: 'node',
    format: 'cjs',
    sourcemap: true,
    external: ['vscode']
});
