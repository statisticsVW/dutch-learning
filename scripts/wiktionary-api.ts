// A small, polite client for the English Wiktionary MediaWiki API, shared by the build scripts.
// Wiktionary content is licensed CC BY-SA 4.0; see content/wiktionary/README.md.

const API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT = 'dutch-learning-content-build/1.0 (build script; Node fetch)';
/** The most pages the API returns in one request. */
const PAGES_PER_REQUEST = 50;

type ApiResponse = {
  error?: { code: string; info: string };
  continue?: Record<string, string>;
  query?: {
    categorymembers?: { title: string }[];
    pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[];
  };
};

/** One MediaWiki API call, waiting and retrying while Wiktionary says it is busy. */
export async function api(params: Record<string, string>): Promise<ApiResponse> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
    const body = response.ok ? ((await response.json()) as ApiResponse) : undefined;
    const busy = response.status === 429 || response.status === 503 || body?.error?.code === 'maxlag';
    if (body && !busy) {
      if (body.error) throw new Error(`Wiktionary error: ${body.error.info}`);
      await sleep(1000); // be gentle with the API
      return body;
    }
    if (!busy || attempt === 8) throw new Error(`Wiktionary answered ${response.status} ${body?.error?.info ?? response.statusText}`);
    const waitSeconds = Number(response.headers.get('retry-after')) || 5 * 2 ** attempt;
    console.log(`Wiktionary is busy; waiting ${waitSeconds}s before trying again.`);
    await sleep(waitSeconds * 1000);
  }
}

/** The wikitext of each page that exists. `label` names the pages in progress messages. */
export async function pageTexts(titles: string[], label: string): Promise<Map<string, string>> {
  const texts = new Map<string, string>();
  for (let i = 0; i < titles.length; i += PAGES_PER_REQUEST) {
    const body = await api({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: titles.slice(i, i + PAGES_PER_REQUEST).join('|'),
    });
    for (const page of body.query?.pages ?? []) {
      const text = page.revisions?.[0]?.slots.main.content;
      if (text) texts.set(page.title, text);
    }
    console.log(`Read ${Math.min(i + PAGES_PER_REQUEST, titles.length)} of ${titles.length} ${label}.`);
  }
  return texts;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
