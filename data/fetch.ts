import type { Row } from "./mappers";

type Page = PromiseLike<{ data: Row[] | null; error: { message: string; code?: string } | null }>;

export class FetchError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "FetchError";
  }
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 30;

/** Unwrap a PostgREST result, throwing on error. */
export async function rows(query: Page): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw new FetchError(error.message, error.code);
  return data ?? [];
}

/** Walk `.range()` pages until a short page. `page` must have a stable ORDER BY. */
export async function allPages(page: (from: number, to: number) => Page): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const batch = await rows(page(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1));
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}
