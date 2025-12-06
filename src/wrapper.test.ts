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

    it("should throw error for empty server object", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          {} as any, // Empty server object
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        "Invalid server configuration: each server must have a 'name' field (string)"
      );
    });

    it("should throw error for server missing name", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { command: "node" } as any,
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        "Invalid server configuration: each server must have a 'name' field (string)"
      );
    });

    it("should throw error for server missing command", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1" } as any,
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server configuration for "server1": each server must have a \'command\' field (string)'
      );
    });

    it("should throw error for server with non-string name", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: 123, command: "node" } as any,
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        "Invalid server configuration: each server must have a 'name' field (string)"
      );
    });

    it("should throw error for server with non-string command", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: 123 } as any,
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server configuration for "server1": each server must have a \'command\' field (string)'
      );
    });

    it("should throw error for reserved server name 'wrapper'", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "wrapper", command: "node", args: ["server.js"] },
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server name "wrapper": server name cannot be "wrapper" as it is reserved for wrapper management tools'
      );
    });

    it("should throw error for reserved server name 'WRAPPER' (case insensitive)", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "WRAPPER", command: "node", args: ["server.js"] },
        ],
      };

      expect(() => new McpWrapper(config)).toThrow(
        'Invalid server name "WRAPPER": server name cannot be "wrapper" as it is reserved for wrapper management tools'
      );
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

    it("should allow URL-based server configuration", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", url: "http://localhost:3000/sse" },
        ],
      };

      const wrapper = new McpWrapper(config);
      expect(wrapper).toBeDefined();
    });

    it("should allow mixed command and URL-based servers", () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", args: ["server1.js"] },
          { name: "server2", url: "http://localhost:3000/sse" },
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

  describe("connectToServers", () => {
    it("should fail when server has neither command nor url", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1" } as WrappedServerConfig,
        ],
      };

      const wrapper = new McpWrapper(config);
      
      await expect(wrapper.connectToServers()).rejects.toThrow(
        'Server "server1" must specify either "command" or "url"'
      );
    });

    it("should fail when server has both command and url", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", url: "http://localhost:3000/sse" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      await expect(wrapper.connectToServers()).rejects.toThrow(
        'Server "server1" cannot specify both "command" and "url"'
      );
    });

    it("should fail when server has invalid URL format", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", url: "not-a-valid-url" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      await expect(wrapper.connectToServers()).rejects.toThrow(
        'Server "server1" has invalid URL: "not-a-valid-url"'
      );
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

  describe("reconnectServer", () => {
    it("should return error for non-existent server", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [],
      };

      const wrapper = new McpWrapper(config);
      const result = await wrapper.reconnectServer("nonexistent");
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found in configuration");
    });

    it("should return error for already connected server", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", args: ["server.js"] },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Manually add a server to simulate it being connected
      // This is testing the edge case handling
      const mockServer = {
        config: config.servers[0],
        client: {} as any,
        transport: {} as any,
        tools: [],
      };
      (wrapper as any).connectedServers.set("server1", mockServer);
      
      const result = await wrapper.reconnectServer("server1");
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("already connected");
    });
  });
});
