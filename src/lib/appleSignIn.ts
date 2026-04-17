const SCRIPT_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { AppleID?: unknown }).AppleID)
    return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Apple ID script"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export async function signInWithApple(): Promise<string> {
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error("VITE_APPLE_CLIENT_ID is not configured");
  }
  await loadScript();
  const AppleID = (
    window as unknown as {
      AppleID: {
        auth: {
          init: (opts: {
            clientId: string;
            scope: string;
            redirectURI: string;
            usePopup: boolean;
          }) => void;
          signIn: () => Promise<{ authorization: { id_token: string } }>;
        };
      };
    }
  ).AppleID;
  const redirectURI = `${window.location.origin}/`;
  AppleID.auth.init({
    clientId,
    scope: "name email",
    redirectURI,
    usePopup: true,
  });
  const res = await AppleID.auth.signIn();
  const idToken = res.authorization?.id_token;
  if (!idToken) throw new Error("No id_token from Apple");
  return idToken;
}
