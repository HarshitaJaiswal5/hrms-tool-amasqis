import { io } from "socket.io-client";
import { ObjectId } from 'mongodb';

const socket = io("http://localhost:5000", {
    auth: {
        token:
           'eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDExMUFBQSIsImtpZCI6Imluc18ydWhlckRvSzVNRnFUTERtUzRhQ0dXenB6Y2EiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJleHAiOjE3NTQwNzI5ODQsImZ2YSI6WzEsLTFdLCJpYXQiOjE3NTQwNzI5MjQsImlzcyI6Imh0dHBzOi8vdXAtc2tpbmstNC5jbGVyay5hY2NvdW50cy5kZXYiLCJuYmYiOjE3NTQwNzI5MTQsInNpZCI6InNlc3NfMzBoSEtDU216b2cxOUwyUjhkWnlpYW85a1RsIiwic3ViIjoidXNlcl8yempXYW9tMnRIdUxsTXJycjgxZFF4SWJXV3MifQ.VuXKkiwAtzAUz9HvHuxI_DMOj6QRwwP3ooYWTnOglzly_WNFK3WhgqHN9LaktPF_dBJrNHgAjBaxj8NNeYhcaKpZcR5I9L2eFNRGo0f8_pz9LfxmsQpNeUKyja3RTK19eXxfXDTF-VzveRrAvHqDB3Eshr7rP5dY2rLuFs20phU5bZ2-73JNtpJtY7uVDp75IJHvMxc8MBprF5DqMH1mJamWOGNXhNH7Mo3uxgRtHUGjdNukAC_3d_iheCx5etpdUyrOaHwFI-WvTJFed6Uo4ivGbz7_6I8KxAqmD_6PHLBhDb_sSIgoc7w5zoxD0HJOrWEW4fFREHADsIoTo2Zt7w'
    }
})
const payload = {
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: "2025-12-31T23:59:59.999Z",
    designation: "Developer",
    status: "Active",
};

socket.on("connect", () => {
    console.log("Connected to socket server");
    socket.emit("hr/dashboard/get-employee-stats", payload);
});

socket.on("hr/dashboard/get-employee-stats-response", (data) => {
    console.log("Received response:", data);
    socket.disconnect();
});

socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
});
