import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import jwt from "jsonwebtoken";

export class SocketService {
  private static io: SocketIOServer;

  static initialize(httpServer: Server) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
      }
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error"));

      try {
        const secret = process.env.JWT_SECRET || "supersecretkey";
        const decoded = jwt.verify(token, secret) as any;
        (socket as any).user = decoded;
        next();
      } catch (err) {
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket) => {
      const user = (socket as any).user;
      
      // Auto-join rooms based on role
      if (user.role === "ADMIN") {
        socket.join("admin");
      } else if (user.role === "SELLER") {
        socket.join(`seller_${user.entityId}`);
      } else if (user.role === "CUSTOMER") {
        socket.join(`customer_${user.entityId}`);
      }

      console.log(`Socket connected: ${user.role} ${user.entityId}`);

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${user.role} ${user.entityId}`);
      });
    });
  }

  static emitToCustomer(customerId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`customer_${customerId}`).emit(event, payload);
  }

  static emitToSeller(sellerId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`seller_${sellerId}`).emit(event, payload);
  }

  static emitToAdmin(event: string, payload: any) {
    if (!this.io) return;
    this.io.to("admin").emit(event, payload);
  }
}
