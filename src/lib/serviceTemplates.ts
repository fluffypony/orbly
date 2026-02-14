export interface ServiceTemplate {
  id: string;
  name: string;
  url: string;
  icon: string;
  category: string;
  suggestedUserAgent?: string;
  requiresCustomUrl?: boolean;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { id: "whatsapp", name: "WhatsApp", url: "https://web.whatsapp.com", icon: "💬", category: "messaging", suggestedUserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
  { id: "slack", name: "Slack", url: "https://app.slack.com", icon: "💼", category: "messaging", suggestedUserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
  { id: "telegram", name: "Telegram", url: "https://web.telegram.org", icon: "✈️", category: "messaging" },
  { id: "discord", name: "Discord", url: "https://discord.com/app", icon: "🎮", category: "messaging", suggestedUserAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" },
  { id: "mattermost", name: "Mattermost", url: "", icon: "🔵", category: "messaging", requiresCustomUrl: true },
  { id: "teams", name: "Microsoft Teams", url: "https://teams.microsoft.com", icon: "👥", category: "messaging" },
  { id: "messenger", name: "Messenger", url: "https://www.messenger.com", icon: "💬", category: "messaging" },
  { id: "gmail", name: "Gmail", url: "https://mail.google.com", icon: "📧", category: "productivity" },
  { id: "outlook", name: "Outlook", url: "https://outlook.office.com", icon: "📨", category: "productivity" },
  { id: "notion", name: "Notion", url: "https://www.notion.so", icon: "📝", category: "productivity" },
  { id: "linear", name: "Linear", url: "https://linear.app", icon: "📐", category: "productivity" },
  { id: "google-calendar", name: "Google Calendar", url: "https://calendar.google.com", icon: "📅", category: "productivity" },
  { id: "google-drive", name: "Google Drive", url: "https://drive.google.com", icon: "📂", category: "productivity" },
  { id: "todoist", name: "Todoist", url: "https://todoist.com/app", icon: "✅", category: "productivity" },
  { id: "trello", name: "Trello", url: "https://trello.com", icon: "📋", category: "productivity" },
  { id: "github", name: "GitHub", url: "https://github.com", icon: "🐙", category: "productivity" },
  { id: "gitlab", name: "GitLab", url: "https://gitlab.com", icon: "🦊", category: "productivity" },
  { id: "protonmail", name: "Proton Mail", url: "https://mail.proton.me", icon: "🔒", category: "productivity" },
  { id: "figma", name: "Figma", url: "https://www.figma.com", icon: "🎨", category: "design" },
  { id: "twitter", name: "X (Twitter)", url: "https://x.com", icon: "🐦", category: "social" },
  { id: "reddit", name: "Reddit", url: "https://www.reddit.com", icon: "🔴", category: "social" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com", icon: "▶️", category: "media" },
  { id: "spotify", name: "Spotify", url: "https://open.spotify.com", icon: "🎵", category: "media" },
];

export const CATEGORIES = [
  { id: "messaging", label: "Messaging" },
  { id: "productivity", label: "Productivity" },
  { id: "design", label: "Design" },
  { id: "social", label: "Social" },
  { id: "media", label: "Media" },
];
