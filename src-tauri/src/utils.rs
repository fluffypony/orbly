/// Simple wildcard matching for URLs. Supports `*` as a wildcard that matches
/// any sequence of characters. Case-insensitive. Unlike the `glob` crate,
/// this works correctly with URL characters like `:`, `/`, `?`, etc.
pub fn wildcard_match(pattern: &str, text: &str) -> bool {
    let pattern = pattern.to_lowercase();
    let text = text.to_lowercase();
    let pattern_chars: Vec<char> = pattern.chars().collect();
    let text_chars: Vec<char> = text.chars().collect();

    let mut pi = 0;
    let mut ti = 0;
    let mut star_pi = usize::MAX;
    let mut star_ti = 0;

    while ti < text_chars.len() {
        if pi < pattern_chars.len() && pattern_chars[pi] == '*' {
            star_pi = pi;
            star_ti = ti;
            pi += 1;
        } else if pi < pattern_chars.len() && pattern_chars[pi] == text_chars[ti] {
            pi += 1;
            ti += 1;
        } else if star_pi != usize::MAX {
            pi = star_pi + 1;
            star_ti += 1;
            ti = star_ti;
        } else {
            return false;
        }
    }

    while pi < pattern_chars.len() && pattern_chars[pi] == '*' {
        pi += 1;
    }

    pi == pattern_chars.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_match() {
        assert!(wildcard_match("hello", "hello"));
        assert!(!wildcard_match("hello", "world"));
    }

    #[test]
    fn test_wildcard_star() {
        assert!(wildcard_match("*.example.com/*", "https://www.example.com/page"));
        assert!(wildcard_match("*.example.com/*", "http://sub.example.com/path/to/page"));
        assert!(!wildcard_match("*.example.com/*", "https://example.org/page"));
    }

    #[test]
    fn test_case_insensitive() {
        assert!(wildcard_match("Hello", "HELLO"));
        assert!(wildcard_match("HELLO", "hello"));
        assert!(wildcard_match("*.Example.COM/*", "https://sub.example.com/path"));
    }

    #[test]
    fn test_empty_strings() {
        assert!(wildcard_match("", ""));
        assert!(!wildcard_match("", "hello"));
        assert!(wildcard_match("*", ""));
        assert!(wildcard_match("*", "anything"));
    }

    #[test]
    fn test_multiple_wildcards() {
        assert!(wildcard_match("*://*.example.com/*", "https://www.example.com/page"));
        assert!(wildcard_match("*google*", "https://mail.google.com/inbox"));
    }

    #[test]
    fn test_url_special_chars() {
        assert!(wildcard_match("*example.com/path?q=*", "https://example.com/path?q=search"));
        assert!(wildcard_match("*://localhost:*", "http://localhost:3000"));
    }
}
