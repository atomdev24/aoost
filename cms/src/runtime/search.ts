// Nav search over pages, diary entries and artwork titles (search.json, built with the site).

type Entry = { title: string; url: string; kind: string; text: string };

export function initSearch() {
  const dialog = document.getElementById("nav-search");
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>("input")!;
  const results = dialog.querySelector<HTMLUListElement>(".search-results")!;
  let index: Entry[] | null = null;
  let opener: HTMLElement | null = null;

  const load = async () => {
    if (!index) {
      try {
        index = (await (await fetch(document.documentElement.dataset.search ?? "/search.json")).json()) as Entry[];
      } catch {
        index = [];
      }
    }
    return index;
  };

  const render = async () => {
    const q = input.value.trim().toLowerCase();
    results.textContent = "";
    if (!q) return;
    const hits = (await load()).filter((e) => `${e.title} ${e.text}`.toLowerCase().includes(q)).slice(0, 12);
    if (!hits.length) {
      const li = document.createElement("li");
      li.className = "none";
      li.textContent = "Nothing found.";
      results.append(li);
      return;
    }
    for (const hit of hits) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = hit.url;
      a.textContent = hit.title;
      const small = document.createElement("small");
      small.textContent = hit.kind;
      a.append(small);
      li.append(a);
      results.append(li);
    }
  };

  const setOpen = (open: boolean) => {
    dialog.hidden = !open;
    document.body.classList.toggle("is-locked", open);
    if (open) {
      input.value = "";
      results.textContent = "";
      input.focus();
      void load();
    } else opener?.focus();
  };

  document.addEventListener("click", (e) => {
    const btn = (e.target as Element).closest<HTMLElement>("[data-search-open]");
    if (btn) {
      opener = btn;
      const sheet = document.getElementById("nav-sheet");
      if (sheet && !sheet.hidden) sheet.querySelector<HTMLElement>(".sheet-close")?.click();
      setOpen(true);
    } else if (e.target === dialog || (e.target as Element).closest(".search-close")) setOpen(false);
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  input.addEventListener("input", () => void render());
}
