import { describe, it, expect } from 'vitest';
import { renderDashboardHtml } from '../views/dashboard';
import vm from 'node:vm';

describe('Dashboard HTML & Client Script Syntax Validation', () => {
  it('renders valid HTML and all embedded JavaScript scripts compile without syntax errors', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('<!DOCTYPE html>');

    // Extract all <script> tags that contain inline JS
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    let scriptCount = 0;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1].trim();
      if (!scriptContent) continue;
      scriptCount++;

      // Verify JavaScript syntax using Node.js vm.Script
      expect(() => {
        try {
          new vm.Script(scriptContent, {
            filename: 'dashboard-inline-script.js',
            displayErrors: true,
          });
        } catch (err: any) {
          throw new Error(`Syntax error in dashboard inline script: ${err.message}\n${err.stack}`);
        }
      }).not.toThrow();
    }

    expect(scriptCount).toBeGreaterThan(0);
  });
});
