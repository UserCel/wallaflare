import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const shimLinkedomPlugin: esbuild.Plugin = {
  name: 'shim-linkedom',
  setup(build) {
    build.onResolve({ filter: /^linkedom$/ }, (args) => {
      return { path: args.path, namespace: 'shim-linkedom' };
    });
    build.onLoad({ filter: /.*/, namespace: 'shim-linkedom' }, () => {
      return {
        contents: "export function parseHTML(html) { return { document: typeof DOMParser !== 'undefined' ? new DOMParser().parseFromString(html, 'text/html') : null }; }",
        loader: 'js'
      };
    });
  }
};

export async function buildEpubClientBundle() {
  const epubTsPath = path.resolve(__dirname, '../src/services/epub.ts');
  const pdfTsPath = path.resolve(__dirname, '../src/services/pdf.ts');
  const outputPath = path.resolve(__dirname, '../src/views/epub-client-bundle.ts');

  // Bundle EPUB engine
  const resEpub = await esbuild.build({
    entryPoints: [epubTsPath],
    bundle: true,
    minify: true,
    plugins: [shimLinkedomPlugin],
    format: 'iife',
    globalName: 'WallaflareEpub',
    write: false,
    target: 'es2020'
  });

  // Bundle PDF engine
  const resPdf = await esbuild.build({
    entryPoints: [pdfTsPath],
    bundle: true,
    minify: true,
    plugins: [shimLinkedomPlugin],
    format: 'iife',
    globalName: 'WallaflarePdf',
    write: false,
    target: 'es2020'
  });

  const bundleCodeEpub = resEpub.outputFiles[0].text;
  const bundleCodePdf = resPdf.outputFiles[0].text;
  const combinedJs = bundleCodeEpub + '\n' + bundleCodePdf;

  const tsContent = `// Auto-generated client bundle of src/services/epub.ts and src/services/pdf.ts\nexport const clientEpubJs = ${JSON.stringify(combinedJs)};\n`;

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log('✓ Successfully updated src/views/epub-client-bundle.ts (' + tsContent.length + ' bytes)');
}

if (require.main === module) {
  buildEpubClientBundle().catch(console.error);
}
