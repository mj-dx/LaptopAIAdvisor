type GeminiRequestOptions = {
  url: string;
  apiKey: string;
  body: unknown;
  label: string;
  maxAttempts?: number;
};

const RETRYABLE_STATUS_CODES =
  new Set([
    408,
    429,
    500,
    502,
    503,
    504,
  ]);

function sleep(
  milliseconds: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function getRetryDelay(
  attempt: number
) {
  const baseDelay =
    1000 *
    Math.pow(
      2,
      attempt - 1
    );

  const jitter =
    Math.floor(
      Math.random() * 400
    );

  return baseDelay + jitter;
}

export class GeminiRequestError
  extends Error {
  status: number | null;
  responseBody: string;

  constructor(
    message: string,
    status: number | null,
    responseBody = ""
  ) {
    super(message);

    this.name =
      "GeminiRequestError";

    this.status =
      status;

    this.responseBody =
      responseBody;
  }
}

export async function requestGemini({
  url,
  apiKey,
  body,
  label,
  maxAttempts = 3,
}: GeminiRequestOptions) {
  let lastError:
    GeminiRequestError | null =
    null;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      const response =
        await fetch(
          url,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-goog-api-key":
                apiKey,
            },

            body:
              JSON.stringify(
                body
              ),

            cache:
              "no-store",
          }
        );

      if (response.ok) {
        return response;
      }

      const errorText =
        await response.text();

      const retryable =
        RETRYABLE_STATUS_CODES.has(
          response.status
        );

      console.error(
        `${label} Gemini request failed`,
        {
          attempt,
          maxAttempts,
          status:
            response.status,
          retryable,
          error:
            errorText,
        }
      );

      lastError =
        new GeminiRequestError(
          `${label} Gemini request failed with HTTP ${response.status}.`,
          response.status,
          errorText
        );

      if (
        !retryable ||
        attempt ===
          maxAttempts
      ) {
        throw lastError;
      }
    } catch (error) {
      if (
        error instanceof
        GeminiRequestError
      ) {
        if (
          !RETRYABLE_STATUS_CODES.has(
            error.status ??
              0
          ) ||
          attempt ===
            maxAttempts
        ) {
          throw error;
        }

        lastError =
          error;
      } else {
        console.error(
          `${label} Gemini network error`,
          {
            attempt,
            maxAttempts,
            error,
          }
        );

        lastError =
          new GeminiRequestError(
            `${label} Gemini network request failed.`,
            null,
            error instanceof
              Error
              ? error.message
              : String(
                  error
                )
          );

        if (
          attempt ===
          maxAttempts
        ) {
          throw lastError;
        }
      }
    }

    const delay =
      getRetryDelay(
        attempt
      );

    console.warn(
      `${label}: retrying Gemini in ${delay}ms`
    );

    await sleep(
      delay
    );
  }

  throw (
    lastError ??
    new GeminiRequestError(
      `${label} Gemini request failed.`,
      null
    )
  );
}