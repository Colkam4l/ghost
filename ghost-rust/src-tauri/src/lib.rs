#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE};
#[cfg(windows)]
use windows::Win32::Foundation::HWND;

use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

struct ProtectionState(Mutex<bool>);

#[tauri::command]
fn get_platform() -> String {
    if cfg!(windows) {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else {
        "linux".to_string()
    }
}

#[tauri::command]
fn toggle_protection(window: tauri::Window, state: State<'_, ProtectionState>) -> bool {
    let mut protection_enabled = state.0.lock().unwrap();
    *protection_enabled = !*protection_enabled;
    
    let new_status = *protection_enabled;
    println!("[TAURI] toggle_protection called. New status: {}", new_status);

    #[cfg(windows)]
    {
        if let Ok(hwnd) = window.hwnd() {
            let affinity = if new_status {
                WDA_EXCLUDEFROMCAPTURE
            } else {
                WDA_NONE
            };
            println!("[TAURI] Setting window display affinity for HWND {:?} to {:?}", hwnd, affinity);
            unsafe {
                let res = SetWindowDisplayAffinity(HWND(hwnd.0 as _), affinity);
                println!("[TAURI] SetWindowDisplayAffinity result: {:?}", res);
            }
        } else {
            println!("[TAURI] Failed to get HWND for window");
        }
    }
    
    // Emit event to frontend
    let _ = window.emit("protection-status", new_status);
    
    new_status
}

use xcap::Monitor;
use image::ImageFormat;
use base64::{Engine as _, engine::general_purpose};
use std::io::Cursor;

#[tauri::command]
async fn capture_screen() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;
    
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    
    image::DynamicImage::ImageRgba8(image)
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| e.to_string())?;
        
    let b64 = general_purpose::STANDARD.encode(&buffer);
    Ok(format!("data:image/png;base64,{}", b64))
}

#[tauri::command]
async fn process_ai_request(
    prompt: String,
    image: Option<String>,
    history: Vec<serde_json::Value>,
    api_key: String,
    api_url: String,
    model: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Special case for Google Gemini (if URL contains googleapis)
    if api_url.contains("googleapis.com") || api_key.starts_with("AIza") {
        return call_gemini_vision(&client, &prompt, image, &api_key, &model).await;
    }

    // Default: Use OpenAI-compatible universal requester
    call_universal_api(&client, &prompt, image, history, &api_key, &api_url, &model).await
}

async fn call_universal_api(
    client: &reqwest::Client,
    prompt: &str,
    image_data: Option<String>,
    history: Vec<serde_json::Value>,
    key: &str,
    base_url: &str,
    model: &str,
) -> Result<String, String> {
    let url = if base_url.ends_with("/chat/completions") {
        base_url.to_string()
    } else {
        format!("{}/chat/completions", base_url.trim_end_matches('/'))
    };

    let mut messages = history;
    
    let mut content_parts = vec![
        serde_json::json!({ "type": "text", "text": prompt })
    ];

    if let Some(img_data) = image_data {
        content_parts.push(serde_json::json!({
            "type": "image_url",
            "image_url": { "url": img_data }
        }));
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": content_parts
    }));

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 4096
    });

    let res = client.post(&url)
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("API Error ({}): {}", status, data["error"]["message"].as_str().unwrap_or("Unknown error")));
    }

    let text = data["choices"][0]["message"]["content"].as_str().unwrap_or("No response");
    Ok(text.to_string())
}

async fn call_gemini_vision(client: &reqwest::Client, prompt: &str, image_data: Option<String>, key: &str, model: &str) -> Result<String, String> {
    let actual_model = if model.is_empty() || model.contains('/') { "gemini-2.5-flash" } else { model };
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}", actual_model, key);
    
    let mut parts = vec![
        serde_json::json!({ "text": prompt })
    ];

    if let Some(img_data) = image_data {
        let img_parts: Vec<&str> = img_data.split(',').collect();
        if img_parts.len() >= 2 {
            parts.push(serde_json::json!({
                "inline_data": { "mime_type": "image/png", "data": img_parts[1] }
            }));
        }
    }
    
    let body = serde_json::json!({
        "contents": [{ "parts": parts }],
        "generationConfig": { "temperature": 0.5, "maxOutputTokens": 4096 }
    });
    
    let res = client.post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
        
    let status = res.status();
    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    
    if !status.is_success() {
        return Err(format!("Gemini API error: {} - {}", status, data["error"]["message"]));
    }
    
    let text = data["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or("No response");
    Ok(text.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(ProtectionState(Mutex::new(true)))
        .invoke_handler(tauri::generate_handler![
            get_platform,
            toggle_protection,
            capture_screen,
            process_ai_request
        ])
        .setup(|app| {
            // Register Shortcuts
            use tauri_plugin_global_shortcut::{ShortcutState};
            let ctrl_shift_c = "Ctrl+Shift+C".parse().unwrap();
            let alt_shift_h = "Alt+Shift+H".parse().unwrap();

            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_shortcuts([ctrl_shift_c, alt_shift_h])?
                    .with_handler(move |app, shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            if shortcut == &ctrl_shift_c {
                                let _ = app.emit("shortcut-capture", ());
                            } else if shortcut == &alt_shift_h {
                                let _ = app.emit("shortcut-hide", ());
                            }
                        }
                    })
                    .build(),
            )?;

            #[cfg(windows)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    if let Ok(hwnd) = window.hwnd() {
                        unsafe {
                            let _ = SetWindowDisplayAffinity(HWND(hwnd.0 as _), WDA_EXCLUDEFROMCAPTURE);
                        }
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
