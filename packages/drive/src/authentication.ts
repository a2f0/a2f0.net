import type { Tearleads } from "@tearleads/client-sdk";

type AuthenticationSession = Pick<
  Tearleads["session"],
  "userIdAcknowledged" | "registerIdentity" | "login"
>;

/** Imported and previously acknowledged identities must never auto-register. */
export async function authenticateDrive(
  session: AuthenticationSession,
  imported: boolean,
  cancelled: () => boolean,
): Promise<boolean | null> {
  let challenge: string | undefined;
  if (!imported && !session.userIdAcknowledged) {
    const registration = await session.registerIdentity();
    if (registration && "challenge" in registration)
      challenge = registration.challenge;
  }
  if (cancelled()) return null;
  return session.login(challenge);
}
