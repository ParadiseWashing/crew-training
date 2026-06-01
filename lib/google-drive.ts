// ─── Google Drive (service account) ──────────────────────────────────────────
//
// Auth via a service account JSON whose contents are stored base64 in
// GOOGLE_SERVICE_ACCOUNT_JSON_B64. The service account email must already
// have Editor access to the target folder (shared by the human owner via
// drive.google.com -> right-click -> Share).

import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

let cached: drive_v3.Drive | null = null;

function loadServiceAccount(): {
  client_email: string;
  private_key: string;
} | null {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64;
  if (!b64) return null;
  try {
    const raw = Buffer.from(b64, "base64").toString("utf-8");
    const json = JSON.parse(raw);
    if (!json.client_email || !json.private_key) return null;
    return { client_email: json.client_email, private_key: json.private_key };
  } catch (err) {
    console.error("[google-drive] failed to decode service account JSON:", err);
    return null;
  }
}

function getDriveClient(): drive_v3.Drive | null {
  if (cached) return cached;
  const sa = loadServiceAccount();
  if (!sa) return null;

  const jwt = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  cached = google.drive({ version: "v3", auth: jwt });
  return cached;
}

/**
 * Upload a PDF (as a Buffer) to the configured Drive folder.
 * Returns { fileId, fileName, webViewLink } on success, or { error } on failure.
 */
export async function uploadPdfToDrive(args: {
  filename: string;
  pdfBuffer: Buffer;
}): Promise<
  | { fileId: string; fileName: string; webViewLink: string | null }
  | { error: string }
> {
  const drive = getDriveClient();
  if (!drive) return { error: "Drive client not configured" };
  const folderId = process.env.HANDBOOK_SIGNATURE_FOLDER_ID;
  if (!folderId) return { error: "HANDBOOK_SIGNATURE_FOLDER_ID not set" };

  try {
    const res = await drive.files.create({
      requestBody: {
        name: args.filename,
        parents: [folderId],
        mimeType: "application/pdf",
      },
      media: {
        mimeType: "application/pdf",
        body: Readable.from(args.pdfBuffer),
      },
      fields: "id,name,webViewLink",
      supportsAllDrives: true,
    });
    return {
      fileId: res.data.id!,
      fileName: res.data.name!,
      webViewLink: res.data.webViewLink ?? null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[google-drive] upload failed:", msg);
    return { error: msg };
  }
}
