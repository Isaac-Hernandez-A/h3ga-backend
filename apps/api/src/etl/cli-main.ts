import { ejecutarCli } from './cli';

// Punto de entrada de `pnpm etl:importar` (se ejecuta compilado: node apps/api/dist/etl/cli-main.js).
ejecutarCli(process.argv.slice(2))
  .then((codigo) => process.exit(codigo))
  .catch(() => process.exit(1));
