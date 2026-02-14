export interface AppStateInfo {
  id: string;
  name: string;
  state: 'loading' | 'active' | 'hibernated' | 'disabled' | 'error' | 'crashed' | 'certificate_error';
  badge_count: number | null;
  current_url: string | null;
  error_message?: string;
}

export type AppEvent =
  | { type: 'app-activated'; appId: string }
  | { type: 'app-hibernated'; appId: string }
  | { type: 'app-disabled'; appId: string }
  | { type: 'app-enabled'; appId: string }
  | { type: 'app-auto-hibernated'; appId: string };
