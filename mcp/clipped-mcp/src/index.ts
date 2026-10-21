#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as http from "http";
import * as https from "https";

const CLIPPED_API_URL = process.env.CLIPPED_API_URL || "http://localhost:3000";

class ClippedServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "clipped-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "generate_video",
          description: "Generate an AI video using Clipped AI",
          inputSchema: {
            type: "object",
            properties: {
              script: {
                type: "string",
                description: "The main text script/prompt for the video",
              },
              workflow: {
                type: "string",
                description: "Workflow type (auto, stories, ai-videos)",
                default: "auto"
              },
              aspectRatio: {
                type: "string",
                description: "Target aspect ratio (16:9, 9:16, 1:1)",
                default: "9:16"
              },
              voice: {
                type: "string",
                description: "Voice ID to use for TTS (e.g. eleven_monolingual_v1)",
              },
              autoFrame: {
                type: "boolean",
                description: "Apply smart Auto-Framing for 9:16 vertical crop",
                default: true
              }
            },
            required: ["script"],
          },
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "generate_video") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments as any;
      if (!args.script) {
        throw new McpError(ErrorCode.InvalidParams, "Script is required");
      }

      try {
        const result = await this.makeApiRequest("/api/workflows/generate", {
          script: args.script,
          workflow: args.workflow || "auto",
          aspectRatio: args.aspectRatio || "9:16",
          voice: args.voice,
          autoFrame: args.autoFrame ?? true
        });

        return {
          content: [
            {
              type: "text",
              text: `Video generation started successfully! Job ID: ${result.jobId}\nCheck the dashboard at ${CLIPPED_API_URL}/dashboard?job=${result.jobId}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to trigger video generation: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private makeApiRequest(path: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(`${CLIPPED_API_URL}${path}`);
      const isHttps = url.protocol === "https:";
      const requestFn = isHttps ? https.request : http.request;

      const data = JSON.stringify(body);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      };

      const req = requestFn(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseData));
            } catch (e) {
              resolve(responseData);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Clipped AI MCP server running on stdio");
  }
}

const server = new ClippedServer();
server.run().catch(console.error);
