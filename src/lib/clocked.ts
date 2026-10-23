import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  AuthenticationError,
  Clocked,
  ClockedError,
  ConnectionError,
  InsufficientCreditsError,
  PermissionDeniedError,
  RateLimitError,
  ValidationError,
} from "clocked-sdk";
import type {
  CompareRequest,
  CompareResponse,
  DecideTextRequest,
  DecideResponse,
  ExtractTextRequest,
  ExtractResponse,
  FillTextRequest,
  FillResponse,
  GroundingTextRequest,
  GroundingResponse,
  InjectionPdfTextRequest,
  InjectionTextRequest,
  InjectionResponse,
  PdfTextResponse,
  PiiPdfTextRequest,
  PiiTextRequest,
  PiiResponse,
  RerankRequest,
  RerankResponse,
  ScriptTextRequest,
  ScriptResponse,
} from "clocked-sdk";

/** Request and response types for the endpoints this app calls, all in text mode. */
interface EndpointMap {
  decide: [DecideTextRequest, DecideResponse];
  extract: [ExtractTextRequest, ExtractResponse];
  fill: [FillTextRequest, FillResponse];
  pii: [PiiTextRequest, PiiResponse];
  injection: [InjectionTextRequest, InjectionResponse];
  script: [ScriptTextRequest, ScriptResponse];
  grounding: [GroundingTextRequest, GroundingResponse];
  compare: [CompareRequest, CompareResponse];
  rerank: [RerankRequest, RerankResponse];
}
export type EndpointName = keyof EndpointMap;

/** The endpoints this app sends a PDF to, read as text, with the marked copy returned. */
interface PdfEndpointMap {
  pii: [PiiPdfTextRequest, PdfTextResponse<PiiResponse>];
  injection: [InjectionPdfTextRequest, PdfTextResponse<InjectionResponse>];
}

/** One line of the audit trail: every Clocked call the analysis made and why. */
export interface CallRecord {
  endpoint: EndpointName;
  purpose: string;
  modelMs: number | null;
  credits: number | null;
  costUsd: number | null;
  cached: boolean;
  /** Set when the call failed; the analysis carried on without it where it could. */
  error?: string;
}

export interface CallOptions {
  /** Cancels the call, including any wait between retries (e.g. when the visitor leaves). */
  signal?: AbortSignal;
}

interface Result<T> {
  data: T;
  modelMs: number | null;
  credits: number | null;
  costUsd: number | null;
}
type Method<E extends EndpointName> = (
  body: EndpointMap[E][0],
  options?: { signal?: AbortSignal; timeout?: number },
) => Promise<Result<EndpointMap[E][1]>>;
type Client = { [E in EndpointName]: Method<E> };

const CONCURRENCY = Math.max(1, Number(process.env.CLOCKED_CONCURRENCY ?? 4));
/** Per attempt. The gateway gives the model up to 110 s; our requests are small, so fail sooner. */
const TIMEOUT_MS = 60_000;
/** Fresh attempts after the service says an attempt has ended (409/5xx with retryAsNew). */
const NEW_ATTEMPTS = 2;
// Development cache: identical requests are answered from disk so iterating on the UI spends no credits.
const CACHE_DIR = process.env.CLOCKED_CACHE_DIR ?? (process.env.NODE_ENV === "production" ? "" : ".cache/clocked");

let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    if (!process.env.CLOCKED_API_KEY) {
      throw new ClockedUnavailable("CLOCKED_API_KEY is not set. Copy .env.example to .env.local and add your key.");
    }
    client = new Clocked({ timeout: TIMEOUT_MS }) as unknown as Client;
  }
  return client;
}

/** Lets tests run the analysis against a fake client. */
export function setClockedClientForTests(fake: Partial<Client> | null) {
  client = fake as Client | null;
}

/**
 * An account-level problem (no key, rejected key, no credits, plan inactive). Retrying or moving
 * on to the next applicant cannot help, so the whole screening stops with a clear message.
 */
export class ClockedUnavailable extends Error {}

/** A short, user-facing reason for a failed call. */
export function describeClockedError(err: unknown): string {
  if (err instanceof ClockedUnavailable) return err.message;
  if (err instanceof InsufficientCreditsError) return "The Clocked account is out of credits.";
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) return "The Clocked key was rejected.";
  if (err instanceof RateLimitError) return "Clocked is busy right now.";
  if (err instanceof ValidationError) return `Clocked could not accept the request (${err.error ?? err.status}).`;
  if (err instanceof ConnectionError) return "Clocked did not answer in time.";
  if (err instanceof ClockedError) return `Clocked returned an error (${err.status ?? "no status"}).`;
  if (err instanceof Error && err.name === "AbortError") return "Cancelled.";
  return "Unexpected error while calling Clocked.";
}

// A FIFO semaphore that keeps us inside the account's concurrency allowance (a bounded queue,
// as the limits guide asks, rather than an unbounded fan-out).
let active = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= CONCURRENCY) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function readCache<T>(key: string): Promise<T | null> {
  if (!CACHE_DIR) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(CACHE_DIR, `${key}.json`), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  if (!CACHE_DIR) return;
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(CACHE_DIR, `${key}.json`), JSON.stringify(value));
}

/**
 * Calls one Clocked endpoint and appends the call, successful or not, to `trail`.
 *
 * Retries follow the Clocked guidance: the SDK already retries 429, 5xx and network failures under
 * one idempotency key, so the work is billed once. When the service says an attempt has ended
 * (`retryAsNew`), starting again is new work; we choose to do that at most twice. Account-level
 * failures surface as {@link ClockedUnavailable}; anything else is rethrown for the caller to
 * decide whether the step is essential.
 */
export async function callClocked<E extends EndpointName>(
  endpoint: E,
  body: EndpointMap[E][0],
  purpose: string,
  trail: CallRecord[],
  options: CallOptions = {},
): Promise<EndpointMap[E][1]> {
  const key = createHash("sha256").update(endpoint).update(JSON.stringify(body)).digest("hex");
  const cached = await readCache<Result<EndpointMap[E][1]>>(key);
  if (cached) {
    trail.push({ endpoint, purpose, modelMs: cached.modelMs, credits: cached.credits, costUsd: cached.costUsd, cached: true });
    return cached.data;
  }

  options.signal?.throwIfAborted();
  try {
    const res = await withSlot(async () => {
      options.signal?.throwIfAborted();
      const c = getClient();
      const method = c[endpoint] as Method<E>;
      for (let attempt = 0; ; attempt++) {
        try {
          return await method.call(c, body, { signal: options.signal });
        } catch (err) {
          if (!(err instanceof ClockedError && err.retryAsNew) || attempt >= NEW_ATTEMPTS) throw err;
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
    });
    trail.push({ endpoint, purpose, modelMs: res.modelMs, credits: res.credits, costUsd: res.costUsd, cached: false });
    await writeCache(key, { data: res.data, modelMs: res.modelMs, credits: res.credits, costUsd: res.costUsd });
    return res.data;
  } catch (err) {
    trail.push({ endpoint, purpose, modelMs: null, credits: null, costUsd: null, cached: false, error: describeClockedError(err) });
    if (err instanceof ValidationError) console.error(`Clocked rejected a ${endpoint} request:`, err.error);
    if (err instanceof InsufficientCreditsError || err instanceof AuthenticationError || err instanceof PermissionDeniedError) {
      throw new ClockedUnavailable(`Screening is unavailable: ${describeClockedError(err).toLowerCase()}`);
    }
    throw err;
  }
}

/** {@link callClocked} with a PDF in place of the text: the same call, typed for the PDF request and answer. */
export function callClockedPdf<E extends keyof PdfEndpointMap>(
  endpoint: E,
  body: PdfEndpointMap[E][0],
  purpose: string,
  trail: CallRecord[],
  options: CallOptions = {},
): Promise<PdfEndpointMap[E][1]> {
  return callClocked(endpoint, body as never, purpose, trail, options) as Promise<PdfEndpointMap[E][1]>;
}
