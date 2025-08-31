import {Server} from "socket.io";
import {Elysia} from "elysia";
import {deleteRoom, queueShift} from "../helpers/database.ts";

const SOCKET_PORT = 3001;
let ls = 0;

export function setupSocketIO(app: Elysia) {
  const io = new Server({
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  }).listen(SOCKET_PORT);

  // Register event handlers
  io.on("connection", (socket) => {
    // Handle joining a room
    socket.on("joinRoom", (roomName: string) => {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);
    });

    // Handle leaving a room
    socket.on("leaveRoom", (roomName: string) => {
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);
    });

    // Handle video ended - broadcast to all in room
    socket.on("videoEnded", (roomName: string) => {
      const newQueue = queueShift(roomName);
      if (!newQueue) return;

      // Broadcast to ALL clients in the room
      io.to(roomName).emit("queueUpdated", newQueue);
    });

    socket.on("videoPaused", (roomName: string) => {
      socket.to(roomName).emit("pauseVideo");
    });

    socket.on("videoPlayed", (roomName: string) => {
      socket.to(roomName).emit("playVideo");
    });

    // Handle sync seconds - broadcast to all EXCEPT sender
    socket.on("syncvideoSeconds", ({ seconds, roomName }: {seconds: number, roomName: string}) => {
      if (ls === seconds) return socket.to(roomName).emit("pauseVideo");
      socket.to(roomName).emit("playVideo");
      socket.to(roomName).emit("videoSecondsUpdated", seconds);
      ls = seconds;
    });

    // Handle host disconnect
    socket.on("hostDisconnect", (roomName: string) => {
      io.to(roomName).emit("hostLeft");
      deleteRoom(roomName);
      // Remove all sockets from the room
      io.in(roomName).socketsLeave(roomName);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  app.all("/socket.io*", async ({request}) => {
    const url = new URL(request.url);

    return fetch(
      url.toString().replace(url.origin, `http://localhost:${SOCKET_PORT}`),
      {
        method: request.method,
        headers: request.headers,
        body: new Uint8Array(await request.arrayBuffer()),
      },
    );
  });

  return io;
}
