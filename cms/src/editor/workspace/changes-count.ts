import { useEffect, useState } from "react";
import { summarizeChanges, type ChangeSummary } from "../../model/changes";
import { useEditor } from "../store";
import { usePublish } from "./publish";

/** The unpublished changes, recounted shortly after edits settle. */
export function useChanges(): ChangeSummary | null {
  const site = useEditor((s) => s.site);
  const published = usePublish((s) => s.published);
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  useEffect(() => {
    if (!published) return;
    const t = setTimeout(() => setSummary(summarizeChanges(published, site)), 250);
    return () => clearTimeout(t);
  }, [site, published]);
  return published ? summary : null;
}
