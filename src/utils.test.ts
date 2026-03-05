import { describe, it, expect, vi } from "vitest";
import {
  prefixToolName,
  parseToolName,
  isValidServerName,
  isValidToolName,
  getSupplementalEnv,
} from "./utils.js";

describe("utils", () => {
  describe("prefixToolName", () => {
    it("should prefix tool name with default separator", () => {
      expect(prefixToolName("myserver", "mytool")).toBe("myserver__mytool");
    });

    it("should prefix tool name with custom separator", () => {
      expect(prefixToolName("myserver", "mytool", "-")).toBe("myserver-mytool");
    });

    it("should handle empty server name", () => {
      expect(prefixToolName("", "mytool")).toBe("__mytool");
    });

    it("should handle empty tool name", () => {
      expect(prefixToolName("myserver", "")).toBe("myserver__");
    });

    it("should handle complex names with dots", () => {
      expect(prefixToolName("github-mcp", "list_issues")).toBe(
        "github-mcp__list_issues"
      );
    });

    it("should handle multi-char separator", () => {
      expect(prefixToolName("server", "tool", "::")).toBe("server::tool");
    });
  });

  describe("parseToolName", () => {
    it("should parse prefixed tool name with default separator", () => {
      const result = parseToolName("myserver__mytool");
      expect(result).toEqual({
        serverName: "myserver",
        originalName: "mytool",
      });
    });

    it("should parse prefixed tool name with custom separator", () => {
      const result = parseToolName("myserver-mytool", "-");
      expect(result).toEqual({
        serverName: "myserver",
        originalName: "mytool",
      });
    });

    it("should return null for name without separator", () => {
      const result = parseToolName("mytool");
      expect(result).toBeNull();
    });

    it("should return null for empty server name", () => {
      const result = parseToolName("__mytool");
      expect(result).toBeNull();
    });

    it("should return null for empty tool name", () => {
      const result = parseToolName("myserver__");
      expect(result).toBeNull();
    });

    it("should handle tool names with underscores", () => {
      const result = parseToolName("github-mcp__list_issues");
      expect(result).toEqual({
        serverName: "github-mcp",
        originalName: "list_issues",
      });
    });

    it("should handle multi-char separator", () => {
      const result = parseToolName("server::tool", "::");
      expect(result).toEqual({
        serverName: "server",
        originalName: "tool",
      });
    });

    it("should only split on first separator occurrence", () => {
      const result = parseToolName("server__tool__extra");
      expect(result).toEqual({
        serverName: "server",
        originalName: "tool__extra",
      });
    });
  });

  describe("isValidServerName", () => {
    it("should return true for valid server name", () => {
      expect(isValidServerName("my-server")).toBe(true);
    });

    it("should return false for server name containing default separator", () => {
      expect(isValidServerName("my__server")).toBe(false);
    });

    it("should return true for server name not containing custom separator", () => {
      expect(isValidServerName("my__server", "-")).toBe(true);
    });

    it("should return false for server name containing custom separator", () => {
      expect(isValidServerName("my-server", "-")).toBe(false);
    });
  });

  describe("isValidToolName", () => {
    it("should return true for valid tool name", () => {
      expect(isValidToolName("my_tool")).toBe(true);
    });

    it("should return false for tool name containing default separator", () => {
      expect(isValidToolName("my__tool")).toBe(false);
    });

    it("should return true for tool name not containing custom separator", () => {
      expect(isValidToolName("my__tool", "-")).toBe(true);
    });

    it("should return false for tool name containing custom separator", () => {
      expect(isValidToolName("my-tool", "-")).toBe(false);
    });
  });

  describe("getSupplementalEnv", () => {
    it("should return ProgramData and ALLUSERSPROFILE on Windows when set", () => {
      const originalPlatform = process.platform;
      const originalEnv = { ...process.env };
      try {
        Object.defineProperty(process, "platform", { value: "win32" });
        process.env.ProgramData = "C:\\ProgramData";
        process.env.ALLUSERSPROFILE = "C:\\ProgramData";

        const env = getSupplementalEnv();
        expect(env.ProgramData).toBe("C:\\ProgramData");
        expect(env.ALLUSERSPROFILE).toBe("C:\\ProgramData");
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
        process.env.ProgramData = originalEnv.ProgramData;
        process.env.ALLUSERSPROFILE = originalEnv.ALLUSERSPROFILE;
      }
    });

    it("should return empty object on non-Windows platforms", () => {
      const originalPlatform = process.platform;
      try {
        Object.defineProperty(process, "platform", { value: "linux" });
        const env = getSupplementalEnv();
        expect(env).toEqual({});
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
      }
    });

    it("should skip env vars that are not set", () => {
      const originalPlatform = process.platform;
      const originalProgramData = process.env.ProgramData;
      const originalAllUsers = process.env.ALLUSERSPROFILE;
      try {
        Object.defineProperty(process, "platform", { value: "win32" });
        delete process.env.ProgramData;
        delete process.env.ALLUSERSPROFILE;

        const env = getSupplementalEnv();
        expect(env.ProgramData).toBeUndefined();
        expect(env.ALLUSERSPROFILE).toBeUndefined();
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
        if (originalProgramData !== undefined) process.env.ProgramData = originalProgramData;
        if (originalAllUsers !== undefined) process.env.ALLUSERSPROFILE = originalAllUsers;
      }
    });
  });
});
