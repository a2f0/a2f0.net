import { expect, mock, test } from "bun:test";
import { authenticateDrive } from "./authentication";

for (const failure of [false, new Error("Network unavailable")]) {
  test(`an imported identity cannot register after ${failure === false ? "a rejected login" : "a network failure"}`, async () => {
    const registerIdentity = mock(async () => {
      throw new Error("Unexpected registration");
    });
    const login = mock(async () => {
      if (failure instanceof Error) throw failure;
      return failure;
    });
    const result = authenticateDrive(
      { userIdAcknowledged: false, registerIdentity, login },
      true,
      () => false,
    );
    if (failure instanceof Error)
      await expect(result).rejects.toThrow("Network unavailable");
    else expect(await result).toBe(false);
    expect(login).toHaveBeenCalledTimes(1);
    expect(registerIdentity).not.toHaveBeenCalled();
  });
}

test("an acknowledged generated identity reconnects without registration", async () => {
  const registerIdentity = mock(async () => {
    throw new Error("Unexpected registration");
  });
  const login = mock(async () => true);
  const session = { userIdAcknowledged: true, registerIdentity, login };
  expect(await authenticateDrive(session, false, () => false)).toBe(true);
  expect(await authenticateDrive(session, false, () => false)).toBe(true);
  expect(login).toHaveBeenCalledTimes(2);
  expect(registerIdentity).not.toHaveBeenCalled();
});

test("a new identity registers and uses the returned challenge exactly once", async () => {
  const registerIdentity = mock(async () => ({
    challenge: "registration-challenge",
    containerId: "root",
    organizationId: "org",
    userId: "user",
  }));
  const login = mock(async (_challenge?: string) => true);
  expect(
    await authenticateDrive(
      { userIdAcknowledged: false, registerIdentity, login },
      false,
      () => false,
    ),
  ).toBe(true);
  expect(registerIdentity).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith("registration-challenge");
});

test("disconnecting during registration prevents the pending login", async () => {
  let cancelled = false;
  const registerIdentity = mock(async () => {
    cancelled = true;
    return null;
  });
  const login = mock(async () => true);
  expect(
    await authenticateDrive(
      { userIdAcknowledged: false, registerIdentity, login },
      false,
      () => cancelled,
    ),
  ).toBeNull();
  expect(login).not.toHaveBeenCalled();
});
