import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useSession } from '@/data';
import { SOCKET_URL } from './config';
import { useSocketStore } from './socket-store';
import { router } from '@/app/router';
import { determineRole, getAuthToken, ensureAuthToken } from './auth-token';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRole, setCurrentRole] = useState(() => determineRole(window.location.pathname));

  const customerSignedIn = useSession((s) => s.customerSignedIn);
  const sellerSignedIn = useSession((s) => s.sellerSignedIn);
  const adminSignedIn = useSession((s) => s.adminSignedIn);
  const hasSession = customerSignedIn || sellerSignedIn || adminSignedIn;

  useEffect(() => {
    const unsubscribe = router.subscribe((state) => {
      const newRole = determineRole(state.location.pathname);
      setCurrentRole((prev) => (prev !== newRole ? newRole : prev));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only connect if there is a session
    if (!hasSession) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let active = true;
    let localSocket: Socket | null = null;

    async function initSocket() {
      let token = getAuthToken(currentRole);
      if (!token) {
        token = await ensureAuthToken(currentRole);
      }

      if (!token || !active) return;

      localSocket = io(SOCKET_URL, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      localSocket.on('connect', () => {
        if (!active) return;
        setIsConnected(true);
        console.log('[Socket] Connected for role:', currentRole);
      });

      localSocket.on('disconnect', () => {
        if (!active) return;
        setIsConnected(false);
        console.log('[Socket] Disconnected for role:', currentRole);
      });

      // Global Event Listeners
      localSocket.on('order_received', (data) => {
        useSocketStore.getState().bumpOrderTick();
        useSocketStore.getState().bumpInventoryTick();
        toast.success('New Order Received!', {
          description: `Order #${data.orderId} has been placed.`,
        });
      });

      localSocket.on('shipment_updated', (data) => {
        useSocketStore.getState().bumpOrderTick();
        toast.info('Shipment Updated', {
          description: `Shipment #${data.shipmentId} is now ${data.status?.replace(/_/g, ' ') || ''}.`,
        });
      });

      localSocket.on('product_moderated', (data) => {
        useSocketStore.getState().bumpInventoryTick();
        toast(data.status === 'APPROVED' ? 'Product Approved' : 'Product Moderated', {
          description: `Your product is now ${data.status}. ${data.reason ? `Reason: ${data.reason}` : ''}`,
        });
      });

      localSocket.on('kyc_updated', (data) => {
        toast(data.status === 'APPROVED' ? 'KYC Approved' : 'KYC Updated', {
          description: `Your KYC status is now ${data.status}. ${data.reason ? `Reason: ${data.reason}` : ''}`,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      });

      setSocket(localSocket);
    }

    initSocket();

    return () => {
      active = false;
      if (localSocket) {
        localSocket.disconnect();
      }
    };
  }, [hasSession, currentRole]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
