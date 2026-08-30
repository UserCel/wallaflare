import * as fs from 'fs';
import * as path from 'path';

export async function buildHtmlBundle(): Promise<{ html: string }> {
  const htmlRoot = path.resolve(__dirname, '../src/client/html');
  const layoutPath = path.join(htmlRoot, 'layout.html');
  const outputPath = path.resolve(__dirname, '../src/views/dashboard-html.ts');

  if (!fs.existsSync(layoutPath)) {
    throw new Error(`layout.html not found at: ${layoutPath}`);
  }

  function resolveIncludes(content: string, currentDir: string): string {
    const includeRegex = /<!--\s*@include\s+([A-Za-z0-9_\-./]+)\s*-->/g;
    return content.replace(includeRegex, (_match, includeRelPath) => {
      const targetPath = path.resolve(currentDir, includeRelPath.trim());
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Included HTML file not found: ${targetPath} (referenced in ${currentDir})`);
      }
      const includedContent = fs.readFileSync(targetPath, 'utf8');
      return resolveIncludes(includedContent, path.dirname(targetPath));
    });
  }

  const rawLayout = fs.readFileSync(layoutPath, 'utf8');
  const assembledHtml = resolveIncludes(rawLayout, htmlRoot);

  const tsContent = `// Auto-generated from src/client/html/ — DO NOT EDIT MANUALLY
export function getDashboardHtmlBody(appName: string = 'Wallaflare'): string {
  const html = ${JSON.stringify(assembledHtml)};
  return html.replace(/\\$\{appName\\}/g, appName);
}
`;

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  console.log(`✓ Successfully updated src/views/dashboard-html.ts (${assembledHtml.length} chars)`);

  return { html: assembledHtml };
}

if (require.main === module) {
  buildHtmlBundle().catch(console.error);
}
