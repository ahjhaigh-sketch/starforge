//! The Windows app: the same web build in a window, plus a save file.
//!
//! Every save is also written to `starforge-save.txt` in the app's data folder
//! (%APPDATA%\io.github.ahjhaigh-sketch.starforge). If the window's own storage is ever
//! cleared, the game loads that file instead. The file is written to a temporary name
//! first and then renamed, so a crash mid-write never leaves half a save.

use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use tauri::Manager;

fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("starforge-save.txt"))
}

#[tauri::command]
fn write_save(app: tauri::AppHandle, code: String) -> Result<(), String> {
    // only ever a save code: refuse anything else rather than write it to disk
    if !code.starts_with("STARFORGE1:") || code.len() > 8_000_000 {
        return Err("not a Starforge save code".into());
    }
    let path = save_path(&app)?;
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, code).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_save(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = save_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(code) => Ok(Some(code)),
        Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![write_save, read_save])
        .run(tauri::generate_context!())
        .expect("error while running Starforge");
}
