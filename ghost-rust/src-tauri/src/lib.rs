#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE, WDA_NONE};
#[cfg(windows)]
use windows::Win32::Foundation::HWND;

use std::sync::Mutex;
use std::fs;
use std::path::Path;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use tauri::{Emitter, Manager, State};

struct ProtectionState(Mutex<bool>);

#[tauri::command]
fn open_in_browser(url: String) -> Result<(), String> {
    tauri_plugin_opener::open_url(&url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_env() -> Result<std::collections::HashMap<String, String>, String> {
    let mut env = std::collections::HashMap::new();
    let paths_to_try = vec![
        Path::new(".env").to_path_buf(),
        Path::new("..").join(".env"),
    ];
    
    for path in paths_to_try {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(path) {
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') {
                        continue;
                    }
                    if let Some(pos) = line.find('=') {
                        let key = line[..pos].trim().to_string();
                        let mut value = line[pos + 1..].trim().to_string();
                        if value.starts_with('"') && value.ends_with('"') {
                            value = value[1..value.len() - 1].to_string();
                        } else if value.starts_with('\'') && value.ends_with('\'') {
                            value = value[1..value.len() - 1].to_string();
                        }
                        env.insert(key, value);
                    }
                }
                return Ok(env);
            }
        }
    }
    Ok(env)
}

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
    
    let trimmed_key = api_key.trim();
    let trimmed_url = api_url.trim();
    let trimmed_model = model.trim();
    
    println!("[TAURI] process_ai_request: url='{}', model='{}', key_len={}, key_starts_with_AIza={}", 
        trimmed_url, trimmed_model, trimmed_key.len(), trimmed_key.starts_with("AIza"));
        
    // Special case for Google Gemini (if URL contains googleapis or key starts with AIza)
    if trimmed_url.contains("googleapis.com") || trimmed_key.starts_with("AIza") {
        return call_gemini_vision(&client, &prompt, image, trimmed_key, trimmed_model).await;
    }

    // Default: Use OpenAI-compatible universal requester
    call_universal_api(&client, &prompt, image, history, trimmed_key, trimmed_url, trimmed_model).await
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

fn start_rust_oauth_server(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:1420") {
            Ok(l) => l,
            Err(e) => {
                println!("[TAURI] Failed to bind OAuth server to 127.0.0.1:1420: {}", e);
                return;
            }
        };
        println!("[TAURI] OAuth loopback listener bound to http://127.0.0.1:1420");
        
        for stream in listener.incoming() {
            if let Ok(mut stream) = stream {
                let mut buffer = [0; 1024];
                if stream.read(&mut buffer).is_ok() {
                    let request = String::from_utf8_lossy(&buffer[..]);
                    if let Some(first_line) = request.lines().next() {
                        if first_line.starts_with("GET /auth/callback") {
                            let mut code = None;
                            let mut error = None;
                            
                            if let Some(query_start) = first_line.find('?') {
                                if let Some(query_end) = first_line[query_start..].find(' ') {
                                    let query = &first_line[query_start + 1..query_start + query_end];
                                    for param in query.split('&') {
                                        let parts: Vec<&str> = param.split('=').collect();
                                        if parts.len() == 2 {
                                            if parts[0] == "code" {
                                                code = Some(parts[1].to_string());
                                            } else if parts[0] == "error" {
                                                error = Some(parts[1].to_string());
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if let Some(c) = code.clone() {
                                let _ = app_handle.emit("oauth-callback", serde_json::json!({ "code": c }));
                            } else if let Some(e) = error.clone() {
                                let _ = app_handle.emit("oauth-callback", serde_json::json!({ "error": e }));
                            }
                            
                            let response_body = r#"
                                <html>
                                <head>
                                  <title>GHOST Auth Success</title>
                                  <style>
                                    body {
                                      font-family: 'Consolas', 'Courier New', monospace;
                                      background: #080a0e;
                                      color: #c9d1d9;
                                      display: flex;
                                      flex-direction: column;
                                      align-items: center;
                                      justify-content: center;
                                      height: 100vh;
                                      margin: 0;
                                    }
                                    .card {
                                      text-align: center;
                                      border: 1px solid #1a2233;
                                      padding: 30px;
                                      border-radius: 8px;
                                      background: #0d1117;
                                      box-shadow: 0 0 16px rgba(0, 255, 136, 0.1);
                                    }
                                    h1 { color: #00ff88; margin: 0 0 10px 0; font-size: 20px; }
                                    p { font-size: 11px; margin: 0; }
                                  </style>
                                </head>
                                <body>
                                  <div class="card">
                                    <h1>👻 GHOST-RUST Auth</h1>
                                    <p>Authentication successful! You can close this tab and return to GHOST.</p>
                                  </div>
                                </body>
                                </html>
                            "#;
                            
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n{}",
                                response_body.len(),
                                response_body
                            );
                            let _ = stream.write_all(response.as_bytes());
                            let _ = stream.flush();
                        }
                    }
                }
            }
        }
    });
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
            process_ai_request,
            open_in_browser,
            get_env
        ])
        .setup(|app| {
            // Start local OAuth server
            start_rust_oauth_server(app.handle().clone());

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
