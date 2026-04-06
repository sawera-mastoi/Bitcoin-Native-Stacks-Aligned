"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { useToast } from "./ui/ToastProvider";

interface StacksContextType {
  userData: any;
  connectWallet: () => void;
  disconnectWallet: () => void;
  doCheckIn: () => Promise<void>;
  doPulse: () => Promise<void>;
  isConnected: boolean;
  isInitializing: boolean;
  isCheckingIn: boolean;
  isPulsing: boolean;
  showSuccess: boolean;
  pulseSuccess: boolean;
  pulseTxId: string | null;
  txStatus: "idle" | "pending" | "success" | "failed";
  lastTxId: string | null;
}

const StacksContext = createContext<StacksContextType | undefined>(undefined);

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || 'a6ae799d0ee3f5904f558fce28f0abf5';

export function StacksProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pulseSuccess, setPulseSuccess] = useState(false);
  const [pulseTxId, setPulseTxId] = useState<string | null>(null);

  // Stored references for browser-only SDKs
  const [sdks, setSdks] = useState<{
    session: any;
    connect: any;
    tx: any;
    network: any;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Dynamic imports to ensure BUILD node process never sees these
        const [Connect, AppKit, Transactions, Network] = await Promise.all([
          import("@stacks/connect"),
          import("@reown/appkit"),
          import("@stacks/transactions"),
          import("@stacks/network")
        ]);

        const appConfig = new Connect.AppConfig(["store_write", "publish_data"]);
        const session = new Connect.UserSession({ appConfig });

        setSdks({
          session,
          connect: Connect,
          tx: Transactions,
          network: Network
        });

        // Initialize Reown AppKit
        AppKit.createAppKit({
          projectId,
          networks: [{
            id: 'stacks:mainnet',
            name: 'Stacks',
            chainId: 1,
            currency: 'STX',
            explorerUrl: 'https://explorer.hiro.so',
            rpcUrl: 'https://api.mainnet.hiro.so'
          } as any],
          metadata: {
            name: 'Bitcoin-Native & Stacks-Aligned',
            description: 'Daily check-ins on Stacks',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
        });

        // Sync session
        if (session.isUserSignedIn()) {
          setUserData(session.loadUserData());
        } else if (session.isSignInPending()) {
          session.handlePendingSignIn().then((data) => {
            setUserData(data);
          });
        }
      } catch (e) {
        console.error("SDK Initialization failed:", e);
      } finally {
        setIsInitializing(false);
      }
    };

    if (typeof window !== 'undefined') {
      init();
    }
  }, []);

  const connectWallet = () => {
    if (!sdks) return;
    sdks.connect.showConnect({
      appDetails: {
        name: 'Bitcoin-Native & Stacks-Aligned',
        icon: window.location.origin + '/favicon.ico',
      },
      userSession: sdks.session,
      onFinish: () => {
        setUserData(sdks.session.loadUserData());
        window.location.reload();
      },
    });
  };

  const disconnectWallet = () => {
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const { toast } = useToast();

  const pollTxStatus = useCallback(async (txId: string) => {
    setTxStatus("pending");
    setLastTxId(txId);
    toast({ title: "Transaction Broadcasted", description: "Monitoring status on-chain...", variant: "loading" });

    const check = async (): Promise<"success" | "pending" | "failed" | "dropped"> => {
      try {
        const { HIRO_API_BASE } = await import("@/config/constants");
        const res = await fetch(`${HIRO_API_BASE}/extended/v1/tx/${txId}`);
        if (!res.ok) return "pending";
        const data: any = await res.json();
        return data.tx_status;
      } catch (e) {
        return "pending";
      }
    };

    const interval = setInterval(async () => {
      const status = await check();
      if (status === "success") {
        setTxStatus("success");
        toast({ title: "Transaction Confirmed", description: "Check-in successful!", variant: "success" });
        clearInterval(interval);
        setTimeout(() => setTxStatus("idle"), 10000);
      } else if (status === "failed" || status === "dropped") {
        setTxStatus("failed");
        toast({ title: "Transaction Failed", description: `Status: ${status}`, variant: "error" });
        clearInterval(interval);
        setTimeout(() => setTxStatus("idle"), 10000);
      }
    }, 10000);
  }, [toast]);

  const connectWallet = useCallback(() => {
    if (!sdks) return;
    sdks.connect.showConnect({
      appConfig: sdks.session.appConfig,
      appDetails: {
        name: "Stacks Aligned",
        icon: "https://cryptologos.cc/logos/stacks-stx-logo.png",
      },
      userSession: sdks.session,
      onFinish: () => {
        const user = sdks.session.loadUserData();
        setUserData(user);
        toast({ title: "Wallet Connected", description: "Successfully authenticated with Stacks.", variant: "success" });
      },
      onCancel: () => {
        toast({ title: "Connection Cancelled", variant: "info" });
      }
    });
  }, [sdks, toast]);

  const disconnectWallet = useCallback(() => {
    if (!sdks) return;
    sdks.session.signUserOut();
    setUserData(null);
    toast({ title: "Wallet Disconnected", variant: "info" });
  }, [sdks, toast]);

  const doCheckIn = useCallback(async () => {
    if (!sdks || !userData) return;
    setIsCheckingIn(true);
    try {
      const { STACKS_CONTRACT_ADDRESS, STACKS_CONTRACT_NAME, NETWORK } = await import("@/config/constants");
      
      await sdks.connect.openContractCall({
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: STACKS_CONTRACT_NAME,
        functionName: "check-in",
        functionArgs: [],
        network: NETWORK === "mainnet" ? new sdks.network.StacksMainnet() : new sdks.network.StacksTestnet(),
        onFinish: (data: any) => {
          setIsCheckingIn(false);
          pollTxStatus(data.txId);
        },
        onCancel: () => {
          setIsCheckingIn(false);
          toast({ title: "Action Cancelled", variant: "info" });
        }
      });
    } catch (e) {
      console.error(e);
      setIsCheckingIn(false);
      toast({ title: "Error", description: "Failed to initiate transaction", variant: "error" });
    }
  }, [sdks, userData, pollTxStatus, toast]);

  const doPulse = async () => {
    if (!sdks || !userData) return;
    setIsPulsing(true);
    setPulseSuccess(false);

    try {
      const network = sdks.network.STACKS_MAINNET;
      const { STACKS_CONTRACT_ADDRESS, ENGAGEMENT_CONTRACT_NAME } = await import("@/config/constants");

      await sdks.connect.openContractCall({
        network,
        contractAddress: STACKS_CONTRACT_ADDRESS,
        contractName: ENGAGEMENT_CONTRACT_NAME,
        functionName: "pulse",
        functionArgs: [],
        postConditionMode: sdks.tx.PostConditionMode.Allow,
        postConditions: [],
        onFinish: (data: any) => {
          setIsPulsing(false);
          setPulseSuccess(true);
          setPulseTxId(data.txId);
          pollTxStatus(data.txId);
          setTimeout(() => {
            setPulseSuccess(false);
            setPulseTxId(null);
          }, 5000);
        },
        onCancel: () => {
          setIsPulsing(false);
        },
      });
    } catch (error) {
      console.error("Pulse error:", error);
      setIsPulsing(false);
    }
  };

  return (
    <StacksContext.Provider
      value={{
        userData,
        connectWallet,
        disconnectWallet,
        doCheckIn,
        doPulse,
        isConnected: !!userData,
        isInitializing,
        isCheckingIn,
        isPulsing,
        showSuccess,
        pulseSuccess,
        pulseTxId,
        txStatus,
        lastTxId
      }}
    >
      {children}
    </StacksContext.Provider>
  );
}

export function useStacks() {
  const context = useContext(StacksContext);
  if (context === undefined) {
    throw new Error("useStacks must be used within a StacksProvider");
  }
  return context;
}
