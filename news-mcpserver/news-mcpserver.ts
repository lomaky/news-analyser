import { NewsMcpServer } from "./mcpserver";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";

const main = async () => {
  // to support multiple simultaneous connections we have a lookup object from
  // sessionId to transport
  const transports: { [sessionId: string]: SSEServerTransport } = {};
  const server = new NewsMcpServer();

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

  app.post("/messages", async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;
    console.log(`Received message from sessionId: ${sessionId}`);
    const transport = transports[sessionId];
    if (transport) {
      console.log("Query parameters:", JSON.stringify(req.query, null, 2));
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No transport found for sessionId");
    }
  });

  console.log(`MCP Server running on port ${port}`);
  app.listen(port);
};

main();
