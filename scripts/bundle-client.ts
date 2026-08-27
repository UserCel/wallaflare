import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

export async function buildClientBundle(): Promise<{ js: string; css: string }> {
  const clientTsPath = path.resolve(__dirname, '../src/client/index.ts');
  const clientCssPath = path.resolve(__dirname, '../src/client/styles/index.css');
  const outputPath = path.resolve(__dirname, '../src/views/dashboard-bundle.ts');

  // Bundle JavaScript
  const resJs = await esbuild.build({
    entryPoints: [clientTsPath],
    bundle: true,
    minifyWhitespace: false,
    minifySyntax: false,
    minifyIdentifiers: false,
    charset: 'utf8',
    format: 'iife',
    write: false,
    target: 'es2020'
  });

  // Bundle CSS
  const resCss = await esbuild.build({
    entryPoints: [clientCssPath],
    bundle: true,
    minify: true,
    charset: 'utf8',
    write: false
  });

  let rawJs = resJs.outputFiles[0].text;
  const css = resCss.outputFiles[0].text;

  // Indent by 2 spaces so top-level functions within IIFE match the original 4-space indentation contract
  const jsLines = rawJs.split('\n');
  const js = jsLines.map(line => line.length > 0 ? '  ' + line : line).join('\n');

  const tsContent = `// Auto-generated client bundle from src/client/
export const clientDashboardCss = ${JSON.stringify(css)};
export const clientDashboardJs = ${JSON.stringify(js)};
`;

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log(`✓ Successfully updated src/views/dashboard-bundle.ts (JS: ${js.length} bytes, CSS: ${css.length} bytes)`);

  return { js, css };
}

if (require.main === module) {
  buildClientBundle().catch(console.error);
}
