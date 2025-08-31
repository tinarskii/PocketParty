import {Elysia} from "elysia";
import {staticPlugin} from '@elysiajs/static'
import {
  createRoom,
  deleteRoom,
  getRoomByName,
  getRoomQueue,
  initializeDatabase, queueShift,
  updateRoomQueue
} from "./helpers/database.ts";
import {renderPage} from "./helpers/renderPage.ts";
import {setupSocketIO} from "./services/socket.ts";
import {getVideoInfoScraper} from "./helpers/youtube.ts";

const app = new Elysia();
const io = setupSocketIO(app);

app.use(staticPlugin({
  prefix: "/",
}));

initializeDatabase();

app.get("/", ({set}) => {
  set.headers["Content-Type"] = "text/html";
  return renderPage({
    path: "./app/home.html",
    pageName: "🏠 Home - PocketParty",
  });
})

app.post("/create", ({body, set}: { body: { room: string, password: string }, set: any }) => {
  let room = body.room.trim();
  let password = body.password.trim();

  if (!room) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "400",
        "{{ message }}": "Room name cannot be empty."
      }
    });
  } else if (!/^[a-zA-Z0-9_-]{3,20}$/.test(room)) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "400",
        "{{ message }}": "Room name must be 3-20 characters long and can only contain letters, numbers, underscores, and hyphens."
      }
    });
  } else if (getRoomByName(room)) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "409",
        "{{ message }}": "Room name already exists. Please choose a different name."
      }
    });
  }

  const id = crypto.randomUUID();
  const success = createRoom(id, room, password);
  if (!success) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "500",
        "{{ message }}": "Internal server error. Please try again later."
      }
    });
  }

  set.status = 303;
  set.headers["Location"] = `/host/${room}`;
  set.headers["Set-Cookie"] = `id=${id}; Path=/; HttpOnly`;
  return "";
});

app.post("/join", ({body, set}: { body: { room: string, password: string }, set: any }) => {
  let room = body.room.trim();
  let password = body.password.trim();

  if (!room) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "400",
        "{{ message }}": "Room name cannot be empty."
      }
    });
  }

  const roomData = getRoomByName(room);
  if (!roomData) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "404",
        "{{ message }}": "Room not found."
      }
    });
  }

  if (roomData.password && roomData.password !== password) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "403",
        "{{ message }}": "Incorrect password."
      }
    });
  }

  set.status = 303;
  set.headers["Location"] = `/join/${room}`;
  return "";
});

// REMOVED socket handling from route handlers - they're now handled globally above
app.get("/host/:room", ({params, headers, set}: { params: { room: string }, headers: any, set: any }) => {
  const room = getRoomByName(params.room);

  if (!room) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "404",
        "{{ message }}": "Room not found."
      }
    });
  }

  const cookies = Object.fromEntries(headers.cookie?.split("; ").map((c: string) => {
    const [key, ...v] = c.split("=");
    return [key, v.join("=")];
  }) || []);
  if (cookies.id !== room.id) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "403",
        "{{ message }}": "You are not authorized to access host view."
      }
    });
  }

  set.headers["Content-Type"] = "text/html";
  return renderPage({
    path: "./app/host/room.html",
    pageName: `Host - ${room.name} - PocketParty`,
    stylesheet: "/css/host.css",
    script: ["/js/host.js"],
  });
});

app.get("/join/:room", ({params, headers, set}: { params: { room: string }, headers: any, set: any }) => {
  const room = getRoomByName(params.room);
  if (!room) {
    set.headers["Content-Type"] = "text/html";
    return renderPage({
      path: "./app/error.html",
      pageName: "Error - PocketParty",
      replace: {
        "{{ statusCode }}": "404",
        "{{ message }}": "Room not found."
      }
    });
  }

  set.headers["Content-Type"] = "text/html";
  return renderPage({
    path: "./app/join/room.html",
    pageName: `Party - ${room.name} - PocketParty`,
    stylesheet: "/css/join.css",
    script: ["/js/join.js"],
  });
});

app.get("/api/getQueue/:room", ({params, set}: { params: { room: string }, set: any }) => {
  const room = getRoomByName(params.room);
  if (!room) {
    set.status = 404;
    return {error: "Room not found."};
  }

  const queue = getRoomQueue(room.name);
  if (queue === null) {
    set.status = 500;
    return {error: "Could not retrieve queue."};
  }

  return {queue};
});

app.post("/api/updateQueue/:room", ({params, body, headers, set}: {
  params: { room: string },
  body: { queue: Array<any> },
  headers: any,
  set: any
}) => {
  const room = getRoomByName(params.room);
  if (!room) {
    set.status = 404;
    return {error: "Room not found."};
  }

  const cookies = Object.fromEntries(headers.cookie?.split("; ").map((c: string) => {
    const [key, ...v] = c.split("=");
    return [key, v.join("=")];
  }) || []);
  if (cookies.id !== room.id) {
    set.status = 403;
    return {error: "You are not authorized to update the queue."};
  }

  const success = updateRoomQueue(room.name, body.queue);
  if (!success) {
    set.status = 500;
    return {error: "Could not update queue."};
  }

  // Broadcast queue update to all clients in the room
  io.to(room.name).emit("queueUpdated", body.queue);

  return {success: true};
});

app.post("/api/addVideoToQueue/:room", async ({params, body, set}: {
  params: { room: string },
  body: { videoID: string },
  set: any
}) => {
  const room = getRoomByName(params.room);
  if (!room) {
    set.status = 404;
    return {error: "Room not found."};
  }

  const queue = getRoomQueue(room.name);
  if (queue === null) {
    set.status = 500;
    return {error: "Could not retrieve queue."};
  }

  let videoData = await getVideoInfoScraper(body.videoID);
  queue.push(videoData);
  const success = updateRoomQueue(room.name, queue);
  if (!success) {
    set.status = 500;
    return {error: "Could not update queue."};
  }

  // Broadcast to all clients in the room (fixed from global emit)
  io.to(room.name).emit("queueUpdated", queue);

  return {success: true};
});

app.get("/js/socket.io/socket.io.js", () => {
  return Bun.file("./node_modules/socket.io/client-dist/socket.io.js");
});

app.listen(Bun.env.PORT || 8080, ({port}) => {
  console.log("Server running at http://localhost:" + port);
});