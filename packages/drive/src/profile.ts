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
  const value = JSON.parse(new TextDecoder().decode(bytes)) as DriveProfile;
  if (
    value?.version !== 1 ||
    value.apiBaseUrl !== apiBaseUrl ||
    !value.identity ||
    !value.session ||
    typeof value.connect !== "boolean" ||
    typeof value.imported !== "boolean" ||
    typeof value.userIdAcknowledged !== "boolean"
  )
    throw new Error(
      "This saved drive cannot be opened. Its local data has been kept.",
    );
  return value;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
