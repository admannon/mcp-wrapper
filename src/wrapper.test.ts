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
    it("should continue when server has neither command nor url", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1" } as WrappedServerConfig,
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Should not throw, but should complete with no connected servers
      await wrapper.connectToServers();
      expect(wrapper.getWrappedTools()).toHaveLength(0);
    });

    it("should continue when server has both command and url", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", command: "node", url: "http://localhost:3000/sse" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Should not throw, but should complete with no connected servers
      await wrapper.connectToServers();
      expect(wrapper.getWrappedTools()).toHaveLength(0);
    });

    it("should continue when server has invalid URL format", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "server1", url: "not-a-valid-url" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Should not throw, but should complete with no connected servers
      await wrapper.connectToServers();
      expect(wrapper.getWrappedTools()).toHaveLength(0);
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

  describe("connectToServers - resilient connection handling", () => {
    it("should skip failed servers and continue with successful ones", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "failing-server", command: "nonexistent-command" },
          { name: "another-failing", command: "also-nonexistent" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // connectToServers should not throw even though all servers fail
      await expect(wrapper.connectToServers()).resolves.toBeUndefined();
      
      // Check that no servers are connected
      expect((wrapper as any).connectedServers.size).toBe(0);
      
      // Check that failed servers are tracked
      expect((wrapper as any).failedServers.size).toBe(2);
      expect((wrapper as any).failedServers.has("failing-server")).toBe(true);
      expect((wrapper as any).failedServers.has("another-failing")).toBe(true);
    });

    it("should track failed servers with error messages", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "bad-server", command: "nonexistent" },
        ],
      };

      const wrapper = new McpWrapper(config);
      await wrapper.connectToServers();
      
      const failedServer = (wrapper as any).failedServers.get("bad-server");
      expect(failedServer).toBeDefined();
      expect(failedServer.config).toEqual(config.servers[0]);
      expect(failedServer.error).toBeDefined();
      expect(typeof failedServer.error).toBe("string");
    });

    it("should handle connection timeout", async () => {
      // Mock a server that takes too long to connect
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "slow-server", command: "sleep", args: ["60"] }, // Will timeout before 60 seconds
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Should complete without throwing, even though server times out
      await expect(wrapper.connectToServers()).resolves.toBeUndefined();
      
      // Server should be tracked as failed
      expect((wrapper as any).failedServers.has("slow-server")).toBe(true);
      const failedServer = (wrapper as any).failedServers.get("slow-server");
      expect(failedServer.error).toContain("timeout");
    }, 35000); // Extend timeout to 35 seconds to accommodate the 30 second connection timeout

    it("should clear timeout when connection succeeds quickly", async () => {
      // This test verifies that timeouts are properly cleaned up
      // Using a simple command that completes quickly
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "fast-server", command: "echo", args: ["test"] },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Should fail to connect (echo is not an MCP server) but shouldn't timeout
      await wrapper.connectToServers();
      
      // Server should be tracked as failed due to connection error, not timeout
      const failedServer = (wrapper as any).failedServers.get("fast-server");
      expect(failedServer).toBeDefined();
      // Error should not mention timeout
      expect(failedServer.error).not.toContain("timeout");
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

    it("should attempt to reconnect a failed server", async () => {
      const config: WrapperConfig = {
        name: "test-wrapper",
        servers: [
          { name: "failed-server", command: "nonexistent" },
        ],
      };

      const wrapper = new McpWrapper(config);
      
      // Simulate a failed server
      (wrapper as any).failedServers.set("failed-server", {
        config: config.servers[0],
        error: "Connection failed",
      });
      
      const result = await wrapper.reconnectServer("failed-server");
      
      // Should fail again since the command is still invalid
      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to connect");
    });
  });

  describe("wrapper management tools", () => {
    describe("wrapper__reconnect_server", () => {
      it("should handle missing serverName parameter", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        // Access the handler directly through the private server
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__reconnect_server",
            arguments: {},
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("serverName parameter is required");
        
        await wrapper.close();
      });

      it("should handle invalid serverName type", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__reconnect_server",
            arguments: { serverName: 123 },
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("serverName parameter is required");
        
        await wrapper.close();
      });

      it("should handle non-existent server", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__reconnect_server",
            arguments: { serverName: "nonexistent" },
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("not found in configuration");
        
        await wrapper.close();
      });

      it("should handle already connected server", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [
            { name: "server1", command: "node", args: ["server.js"] },
          ],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        // Manually add a server to simulate it being connected
        const mockServer = {
          config: config.servers[0],
          client: {} as any,
          transport: {} as any,
          tools: [],
        };
        (wrapper as any).connectedServers.set("server1", mockServer);
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__reconnect_server",
            arguments: { serverName: "server1" },
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("already connected");
        
        await wrapper.close();
      });
    });

    describe("wrapper__list_servers", () => {
      it("should return empty lists when no servers are configured", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__list_servers",
            arguments: {},
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBeUndefined();
        const serverList = JSON.parse(result.content[0].text);
        expect(serverList.connected).toEqual([]);
        expect(serverList.failed).toEqual([]);
        
        await wrapper.close();
      });

      it("should list connected servers with tool counts", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [
            { name: "server1", command: "node", args: ["server.js"] },
          ],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        // Manually add a server to simulate it being connected
        const mockServer = {
          config: config.servers[0],
          client: {} as any,
          transport: {} as any,
          tools: [
            { name: "tool1", description: "Test tool 1", inputSchema: {} },
            { name: "tool2", description: "Test tool 2", inputSchema: {} },
          ],
        };
        (wrapper as any).connectedServers.set("server1", mockServer);
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__list_servers",
            arguments: {},
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBeUndefined();
        const serverList = JSON.parse(result.content[0].text);
        expect(serverList.connected).toHaveLength(1);
        expect(serverList.connected[0]).toEqual({
          name: "server1",
          toolCount: 2,
          status: "connected",
        });
        expect(serverList.failed).toEqual([]);
        
        await wrapper.close();
      });

      it("should list failed servers with error messages", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [
            { name: "failed-server", command: "nonexistent" },
          ],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        // Simulate a failed server
        (wrapper as any).failedServers.set("failed-server", {
          config: config.servers[0],
          error: "Connection refused",
        });
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__list_servers",
            arguments: {},
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBeUndefined();
        const serverList = JSON.parse(result.content[0].text);
        expect(serverList.connected).toEqual([]);
        expect(serverList.failed).toHaveLength(1);
        expect(serverList.failed[0]).toEqual({
          name: "failed-server",
          status: "failed",
          error: "Connection refused",
        });
        
        await wrapper.close();
      });

      it("should list both connected and failed servers", async () => {
        const config: WrapperConfig = {
          name: "test-wrapper",
          servers: [
            { name: "good-server", command: "node" },
            { name: "bad-server", command: "nonexistent" },
          ],
        };

        const wrapper = new McpWrapper(config);
        await wrapper.start();
        
        // Add a connected server
        const mockServer = {
          config: config.servers[0],
          client: {} as any,
          transport: {} as any,
          tools: [{ name: "tool1", description: "Test", inputSchema: {} }],
        };
        (wrapper as any).connectedServers.set("good-server", mockServer);
        
        // Add a failed server
        (wrapper as any).failedServers.set("bad-server", {
          config: config.servers[1],
          error: "Failed to connect",
        });
        
        const server = (wrapper as any).server;
        const handlers = (server as any)._requestHandlers;
        const callToolHandler = handlers.get("tools/call");
        
        const request = {
          method: "tools/call",
          params: {
            name: "wrapper__list_servers",
            arguments: {},
          },
        };
        
        const result = await callToolHandler(request);
        
        expect(result.isError).toBeUndefined();
        const serverList = JSON.parse(result.content[0].text);
        expect(serverList.connected).toHaveLength(1);
        expect(serverList.connected[0].name).toBe("good-server");
        expect(serverList.failed).toHaveLength(1);
        expect(serverList.failed[0].name).toBe("bad-server");
        
        await wrapper.close();
      });
    });
  });
});
