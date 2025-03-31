import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { NewsApi } from "./news-api";

export class NewsMcpServer extends McpServer {
  private static searchNewsToolSchema: Tool = {
    name: "search-news",
    description:
      "Search for Colombian news articles. The query should be a string containing the topic of the news article you are looking for and ideally include the date, if no date, use today's date",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Query about the colombian news",
        },
        date: {
          type: "string",
          description: "Date of interest (ISO date string)",
        },
      },
      required: ["query"],
    },
  };

  constructor() {
    super({
      name: "colombiatimes.co-mcpserver",
      version: "1.0.2",
      description: "ColombiaTimes News MCP Server - Colombian news",
      information: "ColombiaTimes News MCP Server",
      schema: z.object({
        name: z.string(),
      }),
    });
    this.configureMCPServer();
  }

  configureMCPServer() {
    // register capabilities
    this.server.registerCapabilities({
      tools: {
        list: true,
        listChanged: false,
      },
    });
    // set handlers
    // list tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: [NewsMcpServer.searchNewsToolSchema] };
    });
    // call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === NewsMcpServer.searchNewsToolSchema.name) {
        const args = request.params.arguments || {};
        const query = args.query as string;
        const date = args.date as string;
        const newsApi = new NewsApi();
        const result = await newsApi.search(query, date);
        console.log({ result });
        return result;
      }
      throw new Error("Tool not found");
    });
  }
}
