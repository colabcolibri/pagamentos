#!/usr/bin/env node
/**
 * Wrapper para rodar eslint/prettier do front-pagamento com paths corretos.
 * lint-staged passa paths relativos à raiz do repo (front-pagamento/src/...);
 * este script remove o prefixo e roda o comando dentro de front-pagamento.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const frontDir = join(root, "front-pagamento");
const prefix = "front-pagamento/";

const [cmd, ...files] = process.argv.slice(2);
const relative = files
  .filter((f) => f.startsWith(prefix))
  .map((f) => f.slice(prefix.length));

if (relative.length === 0) process.exit(0);

const run = (executable, args) => {
  const r = spawnSync(executable, args, {
    cwd: frontDir,
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (cmd === "eslint") {
  run("pnpm", ["exec", "eslint", "--fix", ...relative]);
} else if (cmd === "prettier") {
  run("pnpm", ["exec", "prettier", "--write", ...relative]);
} else {
  console.error("Uso: node lint-staged-front.mjs eslint|prettier [arquivos...]");
  process.exit(1);
}
