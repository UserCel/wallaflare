import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("KOReader Plugin Automated Test Suite", () => {
  it("executes standalone Lua unit test suite with 100% pass rate", () => {
    const output = execSync("luajit integrations/koreader/wallaflare.koplugin/__tests__/test_plugin.lua", {
      encoding: "utf8"
    });
    expect(output).toContain("All KOReader plugin unit tests passed successfully!");
    expect(output).toContain("0 failed");
  });
});
