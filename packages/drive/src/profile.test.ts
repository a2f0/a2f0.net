import { expect, test } from "bun:test";
import { createMemoryBlobStore, Tearleads } from "@tearleads/client-sdk";
import { readProfile, restoreSession } from "./profile";

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
