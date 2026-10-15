import type {
  IdentityKeyPackage,
  SessionSnapshot,
  Tearleads,
} from "@tearleads/client-sdk";

export interface DriveProfile {
  version: 1;
  apiBaseUrl: string;
  identity: IdentityKeyPackage;
  session: SessionSnapshot;
  userIdAcknowledged: boolean;
  imported: boolean;
  connect: boolean;
}

export function restoreSession(
  client: Tearleads,
  profile: Pick<DriveProfile, "session" | "userIdAcknowledged">,
) {
  // setContext acknowledges a user ID. Locally generated IDs must stay local.
  client.session.setContext({
    ...profile.session,
    userId: profile.userIdAcknowledged ? profile.session.userId : null,
    authToken: null,
    isAuthenticated: false,
    isRoot: false,
  });
  if (!profile.userIdAcknowledged)
    client.session.setUserId(profile.session.userId);
}

export function readProfile(
  bytes: Uint8Array,
  apiBaseUrl: string,
): DriveProfile {
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.apiBaseUrl !== apiBaseUrl ||
    !isIdentityPackage(value.identity) ||
    !isSession(value.session) ||
    typeof value.connect !== "boolean" ||
    typeof value.imported !== "boolean" ||
    typeof value.userIdAcknowledged !== "boolean"
  )
    throw new Error(
      "This saved drive cannot be opened. Its local data has been kept.",
    );
  return {
    version: 1,
    apiBaseUrl,
    identity: value.identity,
    session: value.session,
    connect: value.connect,
    imported: value.imported,
    userIdAcknowledged: value.userIdAcknowledged,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

// Validate the persisted shape here. SDK importKeyPackage then verifies key
// lengths, key-pair consistency, fingerprint, and recovery phrase cryptography.
function isIdentityPackage(value: unknown): value is IdentityKeyPackage {
  return (
    isRecord(value) &&
    value.format === "tearleads.identity-key-package" &&
    value.version === 1 &&
    isString(value.createdAt) &&
    isString(value.signingFingerprint) &&
    (value.seedPhrase === undefined || isString(value.seedPhrase)) &&
    isRecord(value.signingKeyPair) &&
    isString(value.signingKeyPair.signingPublicKey) &&
    isString(value.signingKeyPair.signingPrivateKey) &&
    isRecord(value.encapsulationKeyPair) &&
    isString(value.encapsulationKeyPair.publicKey) &&
    isString(value.encapsulationKeyPair.secretKey)
  );
}

function isSession(value: unknown): value is SessionSnapshot {
  return (
    isRecord(value) &&
    isNullableString(value.authToken) &&
    isNullableString(value.containerId) &&
    isNullableString(value.defaultOrganizationId) &&
    isNullableString(value.organizationId) &&
    isNullableString(value.userId) &&
    typeof value.isAuthenticated === "boolean" &&
    typeof value.isRoot === "boolean" &&
    Array.isArray(value.rootAcknowledgments) &&
    value.rootAcknowledgments.every(
      (entry) =>
        isRecord(entry) &&
        isString(entry.signingFingerprint) &&
        isString(entry.userId) &&
        isString(entry.organizationId) &&
        isNullableString(entry.rootContainerId),
    )
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
