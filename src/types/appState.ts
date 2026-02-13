export interface AppStateInfo {
  id: string;
  name: string;
  state: 'active' | 'hibernated' | 'disabled';
  badge_count: number | null;
  current_url: string | null;
}

export type AppEvent =
  | { type: 'app-activated'; appId: string }
  | { type: 'app-hibernated'; appId: string }
  | { type: 'app-disabled'; appId: string }
  | { type: 'app-enabled'; appId: string }
  | { type: 'app-auto-hibernated'; appId: string };
