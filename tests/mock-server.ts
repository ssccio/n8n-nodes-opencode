import http from "http";

/**
 * Simple mock OpenCode server for testing
 * Implements minimal endpoints needed for tests
 */

interface Session {
  id: string;
  agent: string;
  model: { providerID: string; modelID: string };
  createdAt: string;
}

const sessions: Map<string, Session> = new Map();
let sessionCounter = 0;

const server = http.createServer((req, res) => {
  const { method, url } = req;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // GET /app - App info
  if (method === "GET" && url === "/app") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ name: "opencode", version: "1.0.0-mock" }));
    return;
  }

  // POST /session - Create session
  if (method === "POST" && url === "/session") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { agent, model } = JSON.parse(body);
        const sessionId = `session-${++sessionCounter}`;
        const session: Session = {
          id: sessionId,
          agent,
          model,
          createdAt: new Date().toISOString(),
        };
        sessions.set(sessionId, session);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(session));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request body" }));
      }
    });
    return;
  }

  // POST /session/:id/prompt - Send prompt
  const promptMatch = url?.match(/^\/session\/([^/]+)\/prompt$/);
  if (method === "POST" && promptMatch) {
    const sessionId = promptMatch[1];
    if (!sessions.has(sessionId)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        JSON.parse(body); // Validate JSON
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "queued" }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request body" }));
      }
    });
    return;
  }

  // GET /event - Event stream
  if (method === "GET" && url === "/event") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial connection event
    res.write(
      'data: {"type":"server.connected","timestamp":' + Date.now() + "}\n\n",
    );

    // Simulate some message parts
    setTimeout(() => {
      res.write(
        'data: {"type":"message.part.updated","properties":{"part":{"type":"text","text":"Hello"}}}\n\n',
      );
    }, 100);

    setTimeout(() => {
      res.write(
        'data: {"type":"message.part.updated","properties":{"part":{"type":"text","text":" from"}}}\n\n',
      );
    }, 200);

    setTimeout(() => {
      res.write(
        'data: {"type":"message.part.updated","properties":{"part":{"type":"text","text":" OpenCode!"}}}\n\n',
      );
    }, 300);

    // Send completion event
    setTimeout(() => {
      res.write(
        'data: {"type":"session.updated","properties":{"info":{"status":"completed","cost":0.001}}}\n\n',
      );
      res.end();
    }, 400);

    return;
  }

  // DELETE /session/:id - Delete session
  const deleteMatch = url?.match(/^\/session\/([^/]+)$/);
  if (method === "DELETE" && deleteMatch) {
    const sessionId = deleteMatch[1];
    sessions.delete(sessionId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "deleted" }));
    return;
  }

  // GET /session/:id - Get session
  const getMatch = url?.match(/^\/session\/([^/]+)$/);
  if (method === "GET" && getMatch) {
    const sessionId = getMatch[1];
    const session = sessions.get(sessionId);
    if (!session) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(session));
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const PORT = process.env.PORT || 4096;

server.listen(PORT, () => {
  console.log(`Mock OpenCode server running on http://localhost:${PORT}`);
  console.log("Available endpoints:");
  console.log("  GET  /app");
  console.log("  POST /session");
  console.log("  POST /session/:id/prompt");
  console.log("  GET  /event");
  console.log("  GET  /session/:id");
  console.log("  DELETE /session/:id");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default server;
