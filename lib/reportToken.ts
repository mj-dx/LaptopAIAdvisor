import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

export function generateReportToken() {
  return randomBytes(32).toString("hex");
}

export function hashReportToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function verifyReportToken(
  token: string,
  storedHash: string
) {
  try {
    const candidateHash =
      Buffer.from(
        hashReportToken(token),
        "hex"
      );

    const expectedHash =
      Buffer.from(
        storedHash,
        "hex"
      );

    if (
      candidateHash.length !==
      expectedHash.length
    ) {
      return false;
    }

    return timingSafeEqual(
      candidateHash,
      expectedHash
    );
  } catch {
    return false;
  }
}