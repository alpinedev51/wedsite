import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button } from "../../components/ui/Button";
import { errorMessage } from "../../lib/api";
import {
  downloadGuestListCsv,
  importGuestListCsv,
  listHouseholds,
} from "./guestList.api";
import type {
  GuestImportResponse,
  HouseholdAdminView,
} from "./guestList.types";

// Download the current CSV, edit it externally, re-upload it, and see the
// resulting household/guest table without leaving the page. Three
// independent async operations (initial load, upload, download) each get
// their own loading/error state so one failing doesn't block or hide the
// others.
function GuestListSection() {
  const [households, setHouseholds] = useState<HouseholdAdminView[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<GuestImportResponse | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Used for the post-upload refresh (called from a click handler, so a
  // synchronous setState at the top is fine there).
  const refreshHouseholds = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const page = await listHouseholds();
      setHouseholds(page.items);
      setTotal(page.total);
    } catch (err) {
      setListError(errorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  // Initial load: kept separate from refreshHouseholds and written as a
  // deferred .then()/.catch() chain (no setState call synchronous with the
  // effect body) to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    listHouseholds()
      .then((page) => {
        if (cancelled) return;
        setHouseholds(page.items);
        setTotal(page.total);
      })
      .catch((err: unknown) => {
        if (!cancelled) setListError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setUploadResult(null);
    setUploadError(null);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      const result = await importGuestListCsv(file);
      setUploadResult(result);
      setFile(null);
      await refreshHouseholds();
    } catch (err) {
      setUploadError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadGuestListCsv();
    } catch (err) {
      setDownloadError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 rounded-2xl border border-walnut/12 bg-linen/60 p-6">
        <h2 className="text-xl">Download current guest list</h2>
        <p className="text-sm text-ink/70">
          Pulls a CSV snapshot of every household, guest, and RSVP status
          &mdash; edit it and re-upload below to make changes.
        </p>
        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={downloading}
          className="w-fit"
        >
          {downloading ? "Preparing…" : "Download CSV"}
        </Button>
        {downloadError && (
          <p className="text-sm text-terracotta">{downloadError}</p>
        )}
      </div>

      <form
        onSubmit={handleUpload}
        className="flex flex-col gap-4 rounded-2xl border border-walnut/12 bg-linen/60 p-6"
      >
        <h2 className="text-xl">Upload guest list</h2>
        <p className="text-sm text-ink/70">
          Headers must be exactly:{" "}
          <code>HouseholdName, ContactEmail, GuestName, IsPlusOne</code>.
          Re-uploading is safe &mdash; guests are matched and updated by name
          within a household, not duplicated. To rename a household or guest,
          use Download CSV, edit the names, and upload that file back (keep its
          ID columns). Leaving ContactEmail blank on every row of a household
          removes its saved email. Optional <code>PlusOnesAllowed</code> column:
          how many guests a household may bring (e.g. 1). Their RSVP page then
          asks for each guest&rsquo;s name, meal and dietary notes, and adds
          them to the household as a plus-one.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="text-sm"
        />
        <Button type="submit" disabled={!file || uploading} className="w-fit">
          {uploading ? "Uploading…" : "Upload CSV"}
        </Button>
        {uploadError && (
          <p className="text-sm text-terracotta">{uploadError}</p>
        )}
        {uploadResult && (
          <div className="text-sm">
            <p className="text-olive2">{uploadResult.message}</p>
            {uploadResult.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-terracotta">
                {uploadResult.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl">Current households ({total})</h2>
        {listLoading && <p className="text-sm text-ink/70">Loading…</p>}
        {listError && <p className="text-sm text-terracotta">{listError}</p>}
        {!listLoading && !listError && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-walnut/20 font-utility uppercase tracking-wider text-ink/70">
                  <th className="py-2 pr-4">Household</th>
                  <th className="py-2 pr-4">Contact Email</th>
                  <th className="py-2 pr-4">Guests</th>
                </tr>
              </thead>
              <tbody>
                {households.map((household) => (
                  <tr key={household.id} className="border-b border-walnut/10">
                    <td className="py-2 pr-4">{household.display_name}</td>
                    <td className="py-2 pr-4">
                      {household.contact_email ?? "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {household.guests
                        .map((g) =>
                          g.is_plus_one
                            ? `${g.full_name} (plus-one)`
                            : g.full_name,
                        )
                        .join(", ")}
                      {household.plus_ones_allowed > 0 && (
                        <span className="block text-xs text-ink/60">
                          May bring {household.plus_ones_allowed}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestListSection;
