export type DownloadStatus =
  | { type: "Downloading"; data: { progress: number } }
  | { type: "Complete" }
  | { type: "Failed"; data: { error: string } }
  | { type: "Cancelled" };

export interface DownloadEntry {
  id: string;
  filename: string;
  source_app_id: string;
  source_app_name: string;
  url: string;
  save_path: string;
  size_bytes: number | null;
  status: DownloadStatus;
  created_at: string;
}
