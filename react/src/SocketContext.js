import { createContext, useContext, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();
  const socketRef = useRef(null);
  const [socketState, setSocketState] = useState(null);

  useEffect(() => {
    const connectSocket = async () => {
      if (!isSignedIn) {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocketState(null);
        return;
      }

      try {
        console.log("Getting auth token for socket...");
        const token = await getToken();
        console.log("Token retrieved:", token ? "Token exists" : "No token");
        if (!token) {
          console.error("No auth token available for socket connection");
          return;
        }

        const backend_url =
          process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
        const newSocket = io(backend_url, {
          auth: { token },
          timeout: 20000,
        });

        newSocket.on("connect", () => {
          console.log("Socket connected:", newSocket.id);
        });

        newSocket.on("disconnect", (reason) => {
          console.log("Socket disconnected:", reason);
        });

        newSocket.on("connect_error", (error) => {
          console.error("Socket connection error:", error.message);
        });

        socketRef.current = newSocket;
        setSocketState(newSocket);
      } catch (error) {
        console.error("Failed to initialize socket:", error);
      }
    };

    connectSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketState(null);
    };
  }, [isSignedIn]);

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
