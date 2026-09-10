"use client";

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./admin-api";

const ADMIN_REALTIME_EVENT = "new_inquiry_received";
const ADMIN_ACTIVITY_EVENT = "admin_activity_alert";

let socket: Socket | null = null;

export function connectAdminSocket(): Socket {
  if (!socket || !socket.connected) {
    socket?.disconnect();
    socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function getAdminSocket(): Socket | null {
  return socket;
}

export function disconnectAdminSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeNewInquiry(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on(ADMIN_REALTIME_EVENT, listener);
  return () => {
    activeSocket.off(ADMIN_REALTIME_EVENT, listener);
  };
}

export function subscribeAdminActivity(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on(ADMIN_ACTIVITY_EVENT, listener);
  return () => {
    activeSocket.off(ADMIN_ACTIVITY_EVENT, listener);
  };
}

export function subscribeInventoryNotification(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on("inventory_notification", listener);
  return () => {
    activeSocket.off("inventory_notification", listener);
  };
}

export function subscribeBottleCreated(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on("bottle_created", listener);
  return () => {
    activeSocket.off("bottle_created", listener);
  };
}

export function subscribeBottleUpdated(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on("bottle_updated", listener);
  return () => {
    activeSocket.off("bottle_updated", listener);
  };
}

export function subscribeBottleDeleted(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on("bottle_deleted", listener);
  return () => {
    activeSocket.off("bottle_deleted", listener);
  };
}

export function subscribeMockupProgress(
  listener: (payload: unknown) => void
): () => void {
  const activeSocket = connectAdminSocket();
  activeSocket.on("mockup_progress", listener);
  return () => {
    activeSocket.off("mockup_progress", listener);
  };
}