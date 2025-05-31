import { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { initializeSocket } from "@/lib/socket";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const server = (
    res as NextApiResponse & {
      socket: {
        server: HTTPServer & { io?: SocketIOServer };
      };
    }
  ).socket?.server;

  if (!server) {
    res.status(500).json({ error: "Server not available" });
    return;
  }

  if (!server.io) {
    console.log("Setting up Socket.IO server...");

    const io = initializeSocket(server);
    server.io = io;

    console.log("Socket.IO server initialized");
  } else {
    console.log("Socket.IO server already running");
  }

  res.status(200).json({ message: "Socket.IO server ready" });
}
