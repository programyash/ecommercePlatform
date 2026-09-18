import * as dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { PrismaClient } from "@prisma/client";
import { SocketService } from "./services/socket.service";
import http from "http";

const PORT = process.env.PORT || 5000;
export const prisma = new PrismaClient();

async function startServer() {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");

    const server = http.createServer(app);
    SocketService.initialize(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
