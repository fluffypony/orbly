use std::path::PathBuf;

#[allow(dead_code)]
const DEFAULT_FILTER_LISTS: &[&str] = &[
    "https://easylist.to/easylist/easylist.txt",
    "https://easylist.to/easylist/easyprivacy.txt",
];

pub struct FilterListManager {
    cache_dir: PathBuf,
}

impl FilterListManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let cache_dir = app_data_dir.join("adblock_cache");
        std::fs::create_dir_all(&cache_dir).ok();
        Self { cache_dir }
    }

    #[allow(dead_code)]
    pub fn default_list_urls() -> Vec<String> {
        DEFAULT_FILTER_LISTS
            .iter()
            .map(|s| s.to_string())
            .collect()
    }

    /// Download filter lists, using cache if fresh enough.
    /// Returns the combined filter rules text.
    pub async fn get_filter_rules(
        &self,
        list_urls: &[String],
        force_update: bool,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
        let mut all_rules = String::new();

        for url in list_urls {
            let cache_file = self.cache_file_for_url(url);
            let should_download = force_update || self.is_stale(&cache_file);

            if should_download {
                match self.download_list(url).await {
                    Ok(content) => {
                        std::fs::write(&cache_file, &content)?;
                        all_rules.push_str(&content);
                        all_rules.push('\n');
                    }
                    Err(e) => {
                        log::warn!("Failed to download {}: {}. Using cache.", url, e);
                        if let Ok(cached) = std::fs::read_to_string(&cache_file) {
                            all_rules.push_str(&cached);
                            all_rules.push('\n');
                        }
                    }
                }
            } else {
                if let Ok(cached) = std::fs::read_to_string(&cache_file) {
                    all_rules.push_str(&cached);
                    all_rules.push('\n');
                }
            }
        }

        Ok(all_rules)
    }

    async fn download_list(&self, url: &str) -> Result<String, reqwest::Error> {
        log::info!("Downloading filter list: {}", url);
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;
        let response = client.get(url).send().await?;
        response.text().await
    }

    fn cache_file_for_url(&self, url: &str) -> PathBuf {
        use sha2::{Digest, Sha256};
        let hash = hex::encode(Sha256::digest(url.as_bytes()));
        self.cache_dir.join(format!("{}.txt", &hash[..16]))
    }

    fn is_stale(&self, cache_file: &PathBuf) -> bool {
        match std::fs::metadata(cache_file) {
            Ok(meta) => {
                if let Ok(modified) = meta.modified() {
                    let age = std::time::SystemTime::now()
                        .duration_since(modified)
                        .unwrap_or_default();
                    age > std::time::Duration::from_secs(86400) // 24 hours
                } else {
                    true
                }
            }
            Err(_) => true,
        }
    }
}
