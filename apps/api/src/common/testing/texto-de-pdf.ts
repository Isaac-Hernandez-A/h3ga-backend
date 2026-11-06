import { spawn } from 'node:child_process';
import { join } from 'node:path';

// Extrae el texto de un PDF con pdf-parse (devDependency) en un proceso de Node aparte. Dentro de Jest no se
// puede: pdfjs carga su worker con import() dinámico, que Jest solo admite con --experimental-vm-modules.
const SCRIPT = `
const { PDFParse } = require('pdf-parse');
const partes = [];
process.stdin.on('data', (p) => partes.push(p)).on('end', async () => {
  const lector = new PDFParse({ data: new Uint8Array(Buffer.concat(partes)) });
  try {
    const { text } = await lector.getText();
    process.stdout.write(JSON.stringify(text));
  } finally {
    await lector.destroy();
  }
});
`;

export function textoDePdf(pdf: Buffer): Promise<string> {
  return new Promise((resolver, rechazar) => {
    // apps/api: desde ahí se resuelve pdf-parse.
    const proceso = spawn(process.execPath, ['-e', SCRIPT], {
      cwd: join(__dirname, '..', '..', '..'),
    });
    const salida: Buffer[] = [];
    const errores: Buffer[] = [];
    proceso.stdout.on('data', (p: Buffer) => salida.push(p));
    proceso.stderr.on('data', (p: Buffer) => errores.push(p));
    proceso.on('error', rechazar);
    proceso.on('close', (codigo) => {
      if (codigo !== 0) {
        rechazar(new Error(`pdf-parse falló (${codigo}): ${Buffer.concat(errores).toString()}`));
        return;
      }
      resolver(JSON.parse(Buffer.concat(salida).toString('utf8')) as string);
    });
    proceso.stdin.end(pdf);
  });
}
