#[tauri::command]
pub async fn fetch_favicon(url: String) -> Result<String, String> {
    let parsed = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {e}"))?;
    let base = format!("{}://{}", parsed.scheme(), parsed.host_str().unwrap_or(""));

    // Try fetching the page HTML to find icon links
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let icon_url = match client.get(&url).send().await {
        Ok(resp) => {
            if let Ok(html) = resp.text().await {
                find_icon_url(&html, &base).unwrap_or_else(|| format!("{}/favicon.ico", base))
            } else {
                format!("{}/favicon.ico", base)
            }
        }
        Err(_) => format!("{}/favicon.ico", base),
    };

    // Download the icon
    let icon_resp = client
        .get(&icon_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch icon: {e}"))?;

    let content_type = icon_resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/x-icon")
        .to_string();

    let bytes = icon_resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read icon: {e}"))?;

    if bytes.is_empty() {
        return Err("Empty icon response".to_string());
    }

    use sha2::Digest;
    let _ = sha2::Sha256::digest(&bytes); // validate it's readable

    let mime = if content_type.contains("png") {
        "image/png"
    } else if content_type.contains("svg") {
        "image/svg+xml"
    } else if content_type.contains("gif") {
        "image/gif"
    } else if content_type.contains("jpeg") || content_type.contains("jpg") {
        "image/jpeg"
    } else {
        "image/x-icon"
    };

    use base64::Engine;
    // Use standard base64 encoding
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

fn find_icon_url(html: &str, base: &str) -> Option<String> {
    // Simple parsing - look for <link> tags with rel containing "icon"
    let html_lower = html.to_lowercase();

    // Try apple-touch-icon first (higher quality)
    if let Some(url) = extract_link_href(&html_lower, html, "apple-touch-icon", base) {
        return Some(url);
    }

    // Then shortcut icon
    if let Some(url) = extract_link_href(&html_lower, html, "shortcut icon", base) {
        return Some(url);
    }

    // Then icon
    if let Some(url) = extract_link_href(&html_lower, html, "\"icon\"", base) {
        return Some(url);
    }

    None
}

fn extract_link_href(html_lower: &str, html_orig: &str, rel_value: &str, base: &str) -> Option<String> {
    let mut search_from = 0;
    while let Some(link_pos) = html_lower[search_from..].find("<link") {
        let abs_pos = search_from + link_pos;
        let end_pos = html_lower[abs_pos..].find('>')?;
        let tag = &html_orig[abs_pos..abs_pos + end_pos + 1];
        let tag_lower = &html_lower[abs_pos..abs_pos + end_pos + 1];

        if tag_lower.contains(rel_value) {
            // Extract href
            if let Some(href_pos) = tag_lower.find("href=") {
                let after_href = &tag[href_pos + 5..];
                let quote = after_href.chars().next()?;
                if quote == '"' || quote == '\'' {
                    let value_start = 1;
                    if let Some(value_end) = after_href[value_start..].find(quote) {
                        let href = &after_href[value_start..value_start + value_end];
                        if href.starts_with("http://") || href.starts_with("https://") {
                            return Some(href.to_string());
                        } else if href.starts_with("//") {
                            return Some(format!("https:{}", href));
                        } else if href.starts_with('/') {
                            return Some(format!("{}{}", base, href));
                        } else {
                            return Some(format!("{}/{}", base, href));
                        }
                    }
                }
            }
        }
        search_from = abs_pos + end_pos + 1;
    }
    None
}
