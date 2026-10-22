import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Clocked, ConflictError } from "clocked-sdk";
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
  InjectionTextRequest,
  InjectionResponse,
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

/** One line of the audit trail: every Clocked call the analysis made and why. */
export interface CallRecord {
  endpoint: EndpointName;
  purpose: string;
  modelMs: number | null;
  credits: number | null;
  costUsd: number | null;
  cached: boolean;
}

const CONCURRENCY = Number(process.env.CLOCKED_CONCURRENCY ?? 4);
// Development cache: identical requests are answered from disk so iterating on the UI spends no credits.
const CACHE_DIR = process.env.CLOCKED_CACHE_DIR ?? (process.env.NODE_ENV === "production" ? "" : ".cache/clocked");

let client: Clocked | null = null;
function getClient(): Clocked {
  if (!process.env.CLOCKED_API_KEY) {
    throw new Error("CLOCKED_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  }
  client ??= new Clocked();
  return client;
}

// A small FIFO semaphore that keeps us inside the account's concurrency allowance.
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
 * Calls one Clocked endpoint and appends the call to `trail`.
 * Errors propagate: the analysis decides whether a failed step is fatal.
 */
export async function callClocked<E extends EndpointName>(
  endpoint: E,
  body: EndpointMap[E][0],
  purpose: string,
  trail: CallRecord[],
): Promise<EndpointMap[E][1]> {
  const key = createHash("sha256").update(endpoint).update(JSON.stringify(body)).digest("hex");
  const cached = await readCache<{ data: EndpointMap[E][1]; modelMs: number | null; credits: number | null; costUsd: number | null }>(key);
  if (cached) {
    trail.push({ endpoint, purpose, modelMs: cached.modelMs, credits: cached.credits, costUsd: cached.costUsd, cached: true });
    return cached.data;
  }
  const res = await withSlot(async () => {
    const c = getClient() as unknown as Record<E, (b: EndpointMap[E][0]) => Promise<{
      data: EndpointMap[E][1];
      modelMs: number | null;
      credits: number | null;
      costUsd: number | null;
    }>>;
    // The SDK retries an attempt under one idempotency key. When the service says that attempt
    // has ended (409 + retryAsNew), start a fresh attempt, a bounded number of times.
    for (let attempt = 1; ; attempt++) {
      try {
        return await c[endpoint].call(c, body);
      } catch (err) {
        if (!(err instanceof ConflictError && err.retryAsNew) || attempt >= 3) throw err;
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  });
  trail.push({ endpoint, purpose, modelMs: res.modelMs, credits: res.credits, costUsd: res.costUsd, cached: false });
  await writeCache(key, { data: res.data, modelMs: res.modelMs, credits: res.credits, costUsd: res.costUsd });
  return res.data;
}
