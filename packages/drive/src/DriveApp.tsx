import {
  CloudIcon,
  FolderSimpleIcon,
  HardDrivesIcon,
  KeyIcon,
  LockKeyIcon,
} from "@phosphor-icons/react";
import { ThemeSwitch } from "@tearleads/windowing";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AccountPanel } from "./AccountPanel";
import { DriveErrorContext, ErrorNotice } from "./ErrorNotice";
import { Explorer } from "./Explorer";
import { type DriveHost, type OpenDriveInput, openDrive } from "./host";
import { folderName, rootFolders } from "./model";
import { errorMessage } from "./profile";
import { Welcome } from "./Welcome";

export interface DriveAppProps {
  apiBaseUrl?: string;
}

export default function DriveApp({
  apiBaseUrl = process.env.NEXT_PUBLIC_TEARLEADS_API_URL ??
    "https://api.tearleads.com",
}: DriveAppProps) {
  return <DriveSession key={apiBaseUrl} apiBaseUrl={apiBaseUrl} />;
}

function DriveSession({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [host, setHost] = useState<DriveHost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [openRequest, setOpenRequest] = useState({ apiBaseUrl });
  const current = useRef<DriveHost | null>(null);
  const generation = useRef(0);
  const operations = useRef(Promise.resolve());
  const reportError = useCallback((message: string) => setError(message), []);
  useEffect(() => {
    const thisGeneration = ++generation.current;
    setLoading(true);
    setFailed(false);
    // Serialize boot and cleanup, including React Strict Mode's effect replay.
    operations.current = operations.current
      .then(async () => {
        if (generation.current !== thisGeneration) return;
        const opened = await openDrive(openRequest.apiBaseUrl, (message) => {
          if (generation.current === thisGeneration) reportError(message);
        });
        if (generation.current !== thisGeneration) {
          await opened?.close();
          return;
        }
        current.current = opened;
        setHost(opened);
        setLoading(false);
      })
      .catch((cause) => {
        if (generation.current !== thisGeneration) return;
        reportError(errorMessage(cause));
        setFailed(true);
        setLoading(false);
      });
    return () => {
      ++generation.current;
      const previous = current.current;
      current.current = null;
      operations.current = operations.current.then(() => previous?.close());
    };
  }, [openRequest, reportError]);
  const start = async (input: OpenDriveInput) => {
    const thisGeneration = generation.current;
    setLoading(true);
    setError(null);
    const pending = operations.current.then(async () => {
      try {
        const opened = await openDrive(apiBaseUrl, reportError, input);
        if (generation.current !== thisGeneration) {
          await opened?.close();
          return;
        }
        current.current = opened;
        setHost(opened);
      } catch (cause) {
        if (generation.current === thisGeneration)
          reportError(errorMessage(cause));
      } finally {
        if (generation.current === thisGeneration) setLoading(false);
      }
    });
    operations.current = pending;
    await pending;
  };
  return (
    <DriveErrorContext
      value={{ message: error, dismiss: () => setError(null) }}
    >
      <div className="drive-app">
        <ErrorNotice />
        {host ? (
          <Workspace host={host} reportError={reportError} />
        ) : (
          <>
            <aside className="drive-sidebar">
              <Brand />
              <div className="drive-sidebar-intro">
                <span className="drive-sidebar-label">
                  A NEW HOME FOR YOUR FILES
                </span>
                <p>
                  Less noise.
                  <br />
                  More room.
                </p>
              </div>
              <div className="drive-sidebar-bottom">
                <div className="drive-sidebar-foot">
                  <span>
                    <LockKeyIcon size={18} />
                    Powered by Tearleads
                  </span>
                  <ThemeSwitch className="drive-theme-switch" />
                </div>
              </div>
            </aside>
            <main className="drive-onboarding">
              {failed ? (
                <div className="drive-welcome">
                  <h1>Let’s try again.</h1>
                  <p>Your saved data has been kept.</p>
                  <button
                    type="button"
                    className="drive-primary"
                    onClick={() => {
                      setError(null);
                      setOpenRequest({ apiBaseUrl });
                    }}
                  >
                    Retry opening Drive
                  </button>
                </div>
              ) : (
                <Welcome busy={loading} onOpen={(input) => void start(input)} />
              )}
            </main>
          </>
        )}
      </div>
    </DriveErrorContext>
  );
}

function Brand() {
  return (
    <div className="drive-brand">
      <span className="drive-brand-icon">
        <FolderSimpleIcon size={26} weight="fill" />
      </span>
      <span>
        drive<span className="drive-brand-dot">.</span>
      </span>
      <span className="drive-brand-by">a2f0</span>
    </div>
  );
}

function Workspace({
  host,
  reportError,
}: {
  host: DriveHost;
  reportError(message: string): void;
}) {
  const session = useSyncExternalStore(
    host.client.session.subscribe,
    () => host.client.session.snapshot,
  );
  const snapshot = useSyncExternalStore(
    host.contents.view.subscribe,
    host.contents.view.getSnapshot,
  );
  const online = useSyncExternalStore(
    host.client.network.subscribe,
    () => host.client.network.online,
  );
  const blocked = useSyncExternalStore(
    host.client.syncBillingGate.subscribe,
    () => host.client.syncBillingGate.isBlocked,
  );
  // Keep the initial selection automatic until the user navigates. A recovered
  // root may arrive after the first empty local projection is already ready.
  const [selection, setActiveId] = useState<string | null | undefined>(
    undefined,
  );
  const activeId =
    selection === undefined
      ? (snapshot.containers.find((node) => node.id === session.containerId)
          ?.id ?? null)
      : selection;
  const [account, setAccount] = useState(false);
  const roots = rootFolders(snapshot.containers);
  useEffect(() => {
    if (
      snapshot.ready &&
      selection &&
      !snapshot.containers.some((node) => node.id === selection)
    )
      setActiveId(null);
  }, [snapshot, selection]);
  return (
    <>
      <aside className="drive-sidebar">
        <Brand />
        <nav aria-label="Drive navigation">
          <span className="drive-sidebar-label">WORKSPACE</span>
          <button
            type="button"
            className={activeId === null ? "is-active" : ""}
            onClick={() => setActiveId(null)}
          >
            <HardDrivesIcon size={19} />
            All drives<span className="drive-nav-count">{roots.length}</span>
          </button>
          <span className="drive-sidebar-label drive-folders-label">
            YOUR DRIVES
          </span>
          {roots.map((root) => (
            <button
              type="button"
              key={root.id}
              className={activeId === root.id ? "is-active" : ""}
              onClick={() => setActiveId(root.id)}
            >
              <FolderSimpleIcon size={19} />
              <span className="drive-nav-name">{folderName(root)}</span>
            </button>
          ))}
        </nav>
        <div className="drive-sidebar-bottom">
          <div className="drive-connection">
            <CloudIcon size={21} />
            <div>
              <strong>
                {blocked
                  ? "Sync needs attention"
                  : session.isAuthenticated
                    ? online
                      ? "Connected to Tearleads"
                      : "Working offline"
                    : "On this device"}
              </strong>
              <p>
                {blocked
                  ? "Check your organization’s sync plan."
                  : session.isAuthenticated
                    ? "Your encrypted workspace"
                    : "Connect when you’re ready."}
              </p>
            </div>
            <span
              className={`drive-status-dot ${session.isAuthenticated && online && !blocked ? "is-online" : ""}`}
            />
          </div>
          <button
            type="button"
            className="drive-account-button"
            onClick={() => setAccount(true)}
          >
            <KeyIcon size={18} />
            <span>Your identity</span>
          </button>
          <div className="drive-sidebar-foot">
            <a
              href="https://app.tearleads.com"
              target="_blank"
              rel="noreferrer"
            >
              Open Tearleads ↗
            </a>
            <ThemeSwitch className="drive-theme-switch" />
          </div>
        </div>
      </aside>
      <Explorer
        host={host}
        activeId={activeId}
        onNavigate={setActiveId}
        reportError={reportError}
      />
      {account && (
        <AccountPanel
          host={host}
          onClose={() => setAccount(false)}
          reportError={reportError}
        />
      )}
    </>
  );
}
