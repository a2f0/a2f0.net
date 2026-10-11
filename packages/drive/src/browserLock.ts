/** One host per origin/API avoids competing identity and session persistence. */
export async function acquireDriveLock(name: string): Promise<() => void> {
  if (!navigator.locks)
    throw new Error(
      "Drive needs a browser with Web Locks and private file storage. Try a current Chrome, Firefox, or Safari.",
    );
  return new Promise((resolve, reject) => {
    void navigator.locks
      .request(name, { ifAvailable: true }, (lock) => {
        if (!lock) {
          reject(
            new Error(
              "This drive is already open in another tab. Close it there, then retry.",
            ),
          );
          return;
        }
        return new Promise<void>((release) => resolve(release));
      })
      .catch(reject);
  });
}
