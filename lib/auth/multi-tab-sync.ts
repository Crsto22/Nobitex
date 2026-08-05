const CHANNEL_NAME = "nobitex-auth-events";
const AUTH_EVENT_STORAGE_KEY = "nobitex:auth-event:v1";

type AuthEventType = "logout" | "session-expired";

export function publishAuthEvent(type: AuthEventType) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type, at: Date.now() });
    channel.close();
  } catch {
    try {
      localStorage.setItem(
        AUTH_EVENT_STORAGE_KEY,
        JSON.stringify({ type, at: Date.now() })
      );
      localStorage.removeItem(AUTH_EVENT_STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }
}

export function subscribeAuthEvents(onEvent: (type: AuthEventType) => void) {
  let channel: BroadcastChannel | null = null;
  let useBroadcast = false;

  const onStorage = (e: StorageEvent) => {
    if (e.key !== AUTH_EVENT_STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      if (parsed.type) {
        onEvent(parsed.type);
      }
    } catch {
      // no-op
    }
  };

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type) {
        onEvent(event.data.type);
      }
    };
    useBroadcast = true;
  } catch {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    if (useBroadcast && channel) {
      channel.close();
    } else {
      window.removeEventListener("storage", onStorage);
    }
  };
}
