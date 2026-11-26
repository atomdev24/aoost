import { InDock } from "./Dock";
import { dismissToast, keepDraft, startFromLive, useSync } from "./sync";

/**
 * Under the top bar: a short toast after the draft took in changes from the
 * live site, and a banner when those changes couldn't be merged.
 */
export function SyncNotice() {
  const toast = useSync((s) => s.toast);
  const blocked = useSync((s) => s.info.blocked);
  const busy = useSync((s) => s.busy);
  const error = useSync((s) => s.error);
  if (blocked)
    return (
      <InDock slot="top" name="sync">
      <div className="ed-sync-banner" role="alert">
        <p>{blocked}</p>
        {error ? <p className="ed-sync-error">{error}</p> : null}
        <div className="ed-sync-actions">
          <button
            type="button"
            className="ed-btn ed-btn-sm"
            disabled={busy}
            onClick={() => window.confirm("Throw your draft away and start again from the live site? Unpublished changes on every page will be lost.") && void startFromLive()}
          >
            Start the draft from the live site
          </button>
          <button type="button" className="ed-btn ed-btn-accent ed-btn-sm" disabled={busy} onClick={() => void keepDraft()}>
            Keep my draft
          </button>
        </div>
      </div>
      </InDock>
    );
  if (!toast) return null;
  return (
    <InDock slot="top" name="sync">
    <div className="ed-sync-toast" role="status">
      <span>{toast}</span>
      <button type="button" className="ed-mini" aria-label="Dismiss" onClick={dismissToast}>
        ×
      </button>
    </div>
    </InDock>
  );
}
