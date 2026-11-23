// Coletor (fase 1): baixa os arquivos brutos das fontes públicas e grava um manifesto
// com link, data, tamanho e hash SHA-256 de cada um.
// Uso: npx tsx scripts/coletar-fontes.ts  (precisa de internet com acesso aos sites públicos)
// Saída: dados/brutos/<id>.<ext> e dados/brutos/manifesto.json
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FONTES } from '../src/simulador/fontes';

// Arquivos de dados. Os links de página do manifesto (FONTES) são as referências citadas;
// aqui ficam os downloads diretos. Conferir os links marcados com "conferir" antes de usar.
const DOWNLOADS: { id: string; url: string; ext: string; nota?: string }[] = [
  {
    id: 'inmet-2026',
    url: 'https://portal.inmet.gov.br/uploads/dadoshistoricos/2026.zip',
    ext: 'zip',
    nota: 'padrão de link do portal; conferir. Usar a estação de Interlagos.',
  },
  {
    id: 'sp156-pagina',
    url: 'http://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156',
    ext: 'html',
  },
  {
    id: 'sesana-feiras-pagina',
    url: 'https://prefeitura.sp.gov.br/web/sesana/w/feiras-livres-sp',
    ext: 'html',
    nota: 'a página leva à planilha .xlsx com a lista de feiras',
  },
  {
    id: 'osm-grajau',
    // Ruas do Grajaú (caixa aproximada do distrito) pela Overpass API.
    url:
      'https://overpass-api.de/api/interpreter?data=' +
      encodeURIComponent(
        '[out:json][timeout:120];way["highway"](-23.83,-46.73,-23.72,-46.62);out geom;',
      ),
    ext: 'json',
  },
];

async function main() {
  const dir = join(process.cwd(), 'dados', 'brutos');
  mkdirSync(dir, { recursive: true });
  const manifesto: Record<string, unknown>[] = [];
  for (const d of DOWNLOADS) {
    const quando = new Date().toISOString();
    try {
      const res = await fetch(d.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const arquivo = `${d.id}.${d.ext}`;
      writeFileSync(join(dir, arquivo), buf);
      manifesto.push({
        id: d.id,
        url: d.url,
        acessadoEm: quando,
        arquivo,
        bytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
        nota: d.nota ?? null,
      });
      console.log(`ok   ${d.id} (${buf.length} bytes)`);
    } catch (e) {
      manifesto.push({
        id: d.id,
        url: d.url,
        acessadoEm: quando,
        erro: String(e),
        nota: d.nota ?? null,
      });
      console.log(`erro ${d.id}: ${String(e)}`);
    }
  }
  writeFileSync(
    join(dir, 'manifesto.json'),
    JSON.stringify(
      { geradoEm: new Date().toISOString(), referencias: FONTES, downloads: manifesto },
      null,
      2,
    ),
  );
  console.log(`Manifesto em ${join(dir, 'manifesto.json')}`);
}

void main();
