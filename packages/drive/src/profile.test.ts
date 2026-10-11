import { expect, test } from "bun:test";
import { createMemoryBlobStore, Tearleads } from "@tearleads/client-sdk";
import { type DriveProfile, readProfile, restoreSession } from "./profile";

test("restoring local work cannot acknowledge its provisional user ID", () => {
  const client = new Tearleads({
    blobStoreFactory: createMemoryBlobStore,
    apiBaseUrl: "https://api.example.test",
    identity: { signingFingerprint: "local-test-key" },
  });
  const session = {
    ...client.session.snapshot,
    userId: "local-id",
    organizationId: "local-org",
    containerId: "local-root",
  };
  restoreSession(client, { session, userIdAcknowledged: false });
  expect(client.session.userId).toBe("local-id");
  expect(client.session.containerId).toBe("local-root");
  expect(client.session.userIdAcknowledged).toBe(false);
  expect(client.session.isAuthenticated).toBe(false);
  client.dispose();
});

test("restored server acknowledgments do not restore a bearer token or operator status", () => {
  const client = new Tearleads({
    blobStoreFactory: createMemoryBlobStore,
    apiBaseUrl: "https://api.example.test",
    identity: { signingFingerprint: "remote-test-key" },
  });
  const session = {
    ...client.session.snapshot,
    userId: "remote-id",
    authToken: "expired",
    isAuthenticated: true,
    isRoot: true,
  };
  restoreSession(client, { session, userIdAcknowledged: true });
  expect(client.session.userIdAcknowledged).toBe(true);
  expect(client.session.isAuthenticated).toBe(false);
  expect(client.session.authToken).toBeNull();
  expect(client.session.isRoot).toBe(false);
  client.dispose();
});

test("a saved identity from a different API namespace cannot be restored", () => {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ version: 1, apiBaseUrl: "https://other.example.test" }),
  );
  expect(() => readProfile(bytes, "https://api.example.test")).toThrow(
    "saved drive cannot be opened",
  );
});

test("profile parsing validates nested identity and session data before restoration", async () => {
  const apiBaseUrl = "https://api.example.test";
  const client = new Tearleads({
    apiBaseUrl,
    blobStoreFactory: createMemoryBlobStore,
  });
  try {
    await client.identity.importSeedPhrase(`${"abandon ".repeat(23)}art`);
    const profile: DriveProfile = {
      version: 1,
      apiBaseUrl,
      identity: await client.identity.exportKeyPackage(),
      session: client.session.snapshot,
      connect: false,
      imported: false,
      userIdAcknowledged: false,
    };
    const encode = (value: unknown) =>
      new TextEncoder().encode(JSON.stringify(value));
    expect(readProfile(encode(profile), apiBaseUrl)).toEqual(profile);
    for (const malformed of [
      { ...profile, identity: "not a key package" },
      { ...profile, identity: [] },
      {
        ...profile,
        identity: {
          ...profile.identity,
          signingKeyPair: { signingPublicKey: [] },
        },
      },
      { ...profile, session: "not a session" },
      { ...profile, session: [] },
      { ...profile, session: { ...profile.session, userId: 5 } },
      { ...profile, session: { ...profile.session, isAuthenticated: "true" } },
      {
        ...profile,
        session: { ...profile.session, rootAcknowledgments: "invalid" },
      },
      {
        ...profile,
        session: {
          ...profile.session,
          rootAcknowledgments: [
            {
              signingFingerprint: "fingerprint",
              userId: 5,
              organizationId: "org",
              rootContainerId: null,
            },
          ],
        },
      },
    ])
      expect(() => readProfile(encode(malformed), apiBaseUrl)).toThrow(
        "saved drive cannot be opened",
      );
  } finally {
    client.dispose();
    client.identity.destroy();
  }
});
