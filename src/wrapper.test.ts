import { describe, it, expect, vi } from "vitest";
import { McpWrapper } from "./wrapper.js";
import type { WrapperConfig } from "./types.js";

describe("McpWrapper", () => {
  describe("constructor", () => {
    it("should create a wrapper with valid configuration", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", args: ["server1.js"] },
          { name: "server2", command: "node", args: ["server2.js"] },
        ],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should use default version when not specified", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should use custom version when specified", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        version: "2.0.0",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should use default separator when not specified", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should use custom separator when specified", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
        separator: "-",
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should throw error for server name containing separator", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server__invalid", command: "node", args: ["server.js"] },
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server name "server__invalid": server names cannot contain the separator "__"'
      );
    });

    it("should throw error for server name containing custom separator", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server-invalid", command: "node", args: ["server.js"] },
        ],
        separator: "-",
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server name "server-invalid": server names cannot contain the separator "-"'
      );
    });

    it("should throw error for duplicate server names", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", args: ["server1.js"] },
          { name: "server1", command: "node", args: ["server2.js"] },
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Duplicate server name "server1": each server must have a unique name'
      );
    });

    it("should allow multiple unique server names", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", args: ["server1.js"] },
          { name: "server2", command: "node", args: ["server2.js"] },
          { name: "server3", command: "node", args: ["server3.js"] },
        ],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });
  });

  describe("getWrappedTools", () => {
    it("should return empty array when no servers are connected", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      const tools = wrapper.getWrappedTools();
      expect(tools).toEqual([]);
    });
  });

  describe("close", () => {
    it("should handle close when no servers are connected", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      
      // Should not throw
      await expect(wrapper.close()).resolves.toBeUndefined();
    });
  });
});
