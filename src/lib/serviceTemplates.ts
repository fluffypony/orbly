export interface ServiceTemplate {
  id: string;
  name: string;
  url: string;
  icon: string;
  category: string;
  suggestedUserAgent?: string;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { id: "whatsapp", name: "WhatsApp", url: "https://web.whatsapp.com", icon: "💬", category: "messaging" },
  { id: "slack", name: "Slack", url: "https://app.slack.com", icon: "💼", category: "messaging" },
  { id: "telegram", name: "Telegram", url: "https://web.telegram.org", icon: "✈️", category: "messaging" },
  { id: "discord", name: "Discord", url: "https://discord.com/app", icon: "🎮", category: "messaging" },
  { id: "mattermost", name: "Mattermost", url: "https://mattermost.example.com", icon: "🔵", category: "messaging" },
  { id: "gmail", name: "Gmail", url: "https://mail.google.com", icon: "📧", category: "productivity" },
  { id: "outlook", name: "Outlook", url: "https://outlook.office.com", icon: "📨", category: "productivity" },
  { id: "notion", name: "Notion", url: "https://www.notion.so", icon: "📝", category: "productivity" },
  { id: "linear", name: "Linear", url: "https://linear.app", icon: "📐", category: "productivity" },
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
