#[cfg(target_os = "macos")]
pub fn save_to_icloud(key: &str, json: &str) {
    use objc2_foundation::{NSString, NSUbiquitousKeyValueStore};

    let store = NSUbiquitousKeyValueStore::defaultStore();
    let k = NSString::from_str(key);
    let v = NSString::from_str(json);
    store.setString_forKey(Some(&v), &k);
    let _ = store.synchronize();
}

#[cfg(target_os = "macos")]
pub fn load_from_icloud(key: &str) -> Option<String> {
    use objc2_foundation::{NSString, NSUbiquitousKeyValueStore};

    let store = NSUbiquitousKeyValueStore::defaultStore();
    let _ = store.synchronize();
    let k = NSString::from_str(key);
    store.stringForKey(&k).map(|v| v.to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn save_to_icloud(_key: &str, _json: &str) {}

#[cfg(not(target_os = "macos"))]
pub fn load_from_icloud(_key: &str) -> Option<String> {
    None
}
