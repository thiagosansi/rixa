/**
 * Resolver mínimo para rodar os testes com o type-stripping nativo do Node (sem tsx/ts-node):
 * - imports relativos sem extensão ('./rounds') -> tenta .ts, .tsx, /index.ts
 * - alias '@/x' -> src/x
 */
import { registerHooks } from 'node:module';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function withExtension(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith('@/')) base = path.join(SRC, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const file = base && withExtension(base);
    if (file) return nextResolve(pathToFileURL(file).href, context);
    return nextResolve(specifier, context);
  },
});
