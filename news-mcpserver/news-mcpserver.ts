import { NewsMcpServer } from "./mcpserver";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";

const main = async (mcpTransport: string = "stdio") => {
  const server = new NewsMcpServer();
  if (mcpTransport === "sse") {
    const transports: { [sessionId: string]: SSEServerTransport } = {};
    const app = express();
    app.use(cors());
    const port = process.env.PORT || 3001;

    app.get("/sse", async (_: express.Request, res: express.Response) => {
      const transport = new SSEServerTransport("/messages", res);
      console.log(
        `New SSE connection established for sessionId: ${transport.sessionId}`
      );
      transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete transports[transport.sessionId];
      });
      await server.connect(transport);
    });

    app.post(
      "/messages",
      async (req: express.Request, res: express.Response) => {
        const sessionId = req.query.sessionId as string;
        console.log(`Received message from sessionId: ${sessionId}`);
        const transport = transports[sessionId];
        if (transport) {
          console.log("Query parameters:", JSON.stringify(req.query, null, 2));
          await transport.handlePostMessage(req, res);
        } else {
          res.status(400).send("No transport found for sessionId");
        }
      }
    );

    console.log(`MCP Server running on port ${port}`);
    app.listen(port);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
};

const mcpTransport = process.argv[2] || "stdio";
main(mcpTransport);
