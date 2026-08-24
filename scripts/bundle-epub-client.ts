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
  const outputPath = path.resolve(__dirname, '../src/views/epub-client-bundle.ts');

  const res = await esbuild.build({
    entryPoints: [epubTsPath],
    bundle: true,
    minify: true,
    plugins: [shimLinkedomPlugin],
    format: 'iife',
    globalName: 'WallaflareEpub',
    write: false,
    target: 'es2020'
  });

  const bundleCode = res.outputFiles[0].text;
  const tsContent = `// Auto-generated client bundle of src/services/epub.ts\nexport const clientEpubJs = ${JSON.stringify(bundleCode)};\n`;

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log('✓ Successfully updated src/views/epub-client-bundle.ts (' + tsContent.length + ' bytes)');
}

if (require.main === module) {
  buildEpubClientBundle().catch(console.error);
}
