mod database;
mod fit_parser;

use database::{Database, InsertWorkout, Stats, MonthlyStats, StreakInfo, PersonalRecords, ContributionDay, WeeklySummary, Workout, WorkoutSummary};
use fit_parser::{parse_fit_file, GpsPoint, ChartData};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, State};

struct AppState {
    db: Database,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkoutsResponse {
    workouts: Vec<WorkoutSummary>,
    total: i64,
    page: i64,
    per_page: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct UploadResult {
    success: bool,
    message: String,
    workout_id: Option<i64>,
    duplicate: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ActivityBreakdown {
    name: String,
    count: i64,
}

// Commands

#[tauri::command]
fn get_workouts(
    state: State<AppState>,
    page: Option<i64>,
    per_page: Option<i64>,
    workout_type: Option<String>,
    tag: Option<String>,
    search: Option<String>,
    date_start: Option<String>,
    date_end: Option<String>,
    min_distance: Option<f64>,
    max_distance: Option<f64>,
    min_duration: Option<i64>,
    max_duration: Option<i64>,
) -> Result<WorkoutsResponse, String> {
    let page = page.unwrap_or(1);
    let per_page = per_page.unwrap_or(15);
    let offset = (page - 1) * per_page;

    let workouts = state.db.get_workouts(
        per_page,
        offset,
        workout_type.as_deref(),
        tag.as_deref(),
        search.as_deref(),
        date_start.as_deref(),
        date_end.as_deref(),
        min_distance,
        max_distance,
        min_duration,
        max_duration,
    ).map_err(|e| e.to_string())?;

    let total = state.db.get_total_workout_count(
        workout_type.as_deref(),
        tag.as_deref(),
        search.as_deref(),
        date_start.as_deref(),
        date_end.as_deref(),
        min_distance,
        max_distance,
        min_duration,
        max_duration,
    ).map_err(|e| e.to_string())?;

    Ok(WorkoutsResponse {
        workouts,
        total,
        page,
        per_page,
    })
}

#[tauri::command]
fn get_workout(state: State<AppState>, id: i64) -> Result<Option<Workout>, String> {
    state.db.get_workout(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_workout_chart_data(state: State<AppState>, id: i64) -> Result<Option<ChartData>, String> {
    let chart_json = state.db.get_workout_chart_data(id).map_err(|e| e.to_string())?;
    match chart_json {
        Some(json) => {
            let data: ChartData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        None => Ok(None)
    }
}

#[tauri::command]
fn get_workout_gps_data(state: State<AppState>, id: i64) -> Result<Option<Vec<GpsPoint>>, String> {
    let gps_json = state.db.get_workout_gps_data(id).map_err(|e| e.to_string())?;
    match gps_json {
        Some(json) => {
            let data: Vec<GpsPoint> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
            Ok(Some(data))
        }
        None => Ok(None)
    }
}

#[tauri::command]
fn delete_workout(state: State<AppState>, id: i64) -> Result<bool, String> {
    state.db.delete_workout(id).map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_workout(state: State<AppState>, id: i64, name: String) -> Result<bool, String> {
    state.db.rename_workout(id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_workout_tags(state: State<AppState>, id: i64, tags: Vec<String>) -> Result<bool, String> {
    let tags_json = serde_json::to_string(&tags).map_err(|e| e.to_string())?;
    state.db.update_tags(id, &tags_json).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_workout_notes(state: State<AppState>, id: i64, notes: String) -> Result<bool, String> {
    state.db.update_notes(id, &notes).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_stats(state: State<AppState>) -> Result<Stats, String> {
    state.db.get_stats().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_monthly_stats(state: State<AppState>) -> Result<MonthlyStats, String> {
    state.db.get_monthly_stats().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_streak_info(state: State<AppState>) -> Result<StreakInfo, String> {
    state.db.get_streak_info().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_personal_records(state: State<AppState>) -> Result<PersonalRecords, String> {
    state.db.get_personal_records().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_contribution_calendar(state: State<AppState>, days: Option<i64>) -> Result<Vec<ContributionDay>, String> {
    state.db.get_contribution_calendar(days.unwrap_or(365)).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_weekly_summary(state: State<AppState>, weeks: Option<i64>) -> Result<Vec<WeeklySummary>, String> {
    state.db.get_weekly_summary(weeks.unwrap_or(8)).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_activity_breakdown(state: State<AppState>) -> Result<Vec<ActivityBreakdown>, String> {
    let breakdown = state.db.get_activity_breakdown().map_err(|e| e.to_string())?;
    Ok(breakdown.into_iter().map(|(name, count)| ActivityBreakdown { name, count }).collect())
}

#[tauri::command]
fn get_all_tags(state: State<AppState>) -> Result<Vec<String>, String> {
    state.db.get_all_tags().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_workout_by_date(state: State<AppState>, date: String) -> Result<Option<Workout>, String> {
    state.db.get_workout_by_date(&date).map_err(|e| e.to_string())
}

#[tauri::command]
fn upload_fit_file(state: State<AppState>, file_path: String) -> Result<UploadResult, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Ok(UploadResult {
            success: false,
            message: "File not found".to_string(),
            workout_id: None,
            duplicate: false,
        });
    }

    // Parse the FIT file
    let parsed = match parse_fit_file(&path) {
        Ok(data) => data,
        Err(e) => {
            return Ok(UploadResult {
                success: false,
                message: format!("Failed to parse FIT file: {}", e),
                workout_id: None,
                duplicate: false,
            });
        }
    };

    // Check for duplicate
    if state.db.workout_exists(&parsed.file_hash).map_err(|e| e.to_string())? {
        return Ok(UploadResult {
            success: false,
            message: "This workout has already been uploaded".to_string(),
            workout_id: None,
            duplicate: true,
        });
    }

    // Insert into database
    let insert_workout = InsertWorkout {
        file_hash: parsed.file_hash,
        filename: parsed.filename,
        name: None,
        workout_type: parsed.workout_type,
        start_time: parsed.start_time,
        end_time: parsed.end_time,
        duration_seconds: parsed.duration_seconds,
        distance_meters: parsed.distance_meters,
        total_calories: parsed.total_calories,
        avg_heart_rate: parsed.avg_heart_rate,
        max_heart_rate: parsed.max_heart_rate,
        avg_power_watts: parsed.avg_power_watts,
        max_power_watts: parsed.max_power_watts,
        avg_cadence: parsed.avg_cadence,
        max_cadence: parsed.max_cadence,
        avg_speed_mps: parsed.avg_speed_mps,
        max_speed_mps: parsed.max_speed_mps,
        elevation_gain_meters: parsed.elevation_gain_meters,
        elevation_loss_meters: parsed.elevation_loss_meters,
        gps_data: Some(serde_json::to_string(&parsed.gps_data).unwrap_or_default()),
        sensor_data: Some(serde_json::to_string(&parsed.sensor_data).unwrap_or_default()),
        chart_data: Some(serde_json::to_string(&parsed.chart_data).unwrap_or_default()),
    };

    let workout_id = state.db.insert_workout(&insert_workout).map_err(|e| e.to_string())?;

    Ok(UploadResult {
        success: true,
        message: "Workout uploaded successfully".to_string(),
        workout_id: Some(workout_id),
        duplicate: false,
    })
}

#[tauri::command]
fn upload_fit_files(state: State<AppState>, file_paths: Vec<String>) -> Result<Vec<UploadResult>, String> {
    let mut results = Vec::new();
    for path in file_paths {
        let result = upload_fit_file(state.clone(), path)?;
        results.push(result);
    }
    Ok(results)
}

#[tauri::command]
fn upload_fit_folder(state: State<AppState>, folder_path: String) -> Result<Vec<UploadResult>, String> {
    let path = PathBuf::from(&folder_path);
    
    if !path.exists() || !path.is_dir() {
        return Ok(vec![UploadResult {
            success: false,
            message: "Folder not found".to_string(),
            workout_id: None,
            duplicate: false,
        }]);
    }

    let mut file_paths = Vec::new();
    
    // Recursively find all .fit files
    fn find_fit_files(dir: &PathBuf, files: &mut Vec<String>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    find_fit_files(&path, files);
                } else if let Some(ext) = path.extension() {
                    if ext.to_ascii_lowercase() == "fit" {
                        if let Some(path_str) = path.to_str() {
                            files.push(path_str.to_string());
                        }
                    }
                }
            }
        }
    }
    
    find_fit_files(&path, &mut file_paths);
    
    if file_paths.is_empty() {
        return Ok(vec![UploadResult {
            success: false,
            message: "No FIT files found in folder".to_string(),
            workout_id: None,
            duplicate: false,
        }]);
    }
    
    // Upload all found files
    upload_fit_files(state, file_paths)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
            
            // Initialize database
            let db_path = app_data_dir.join("workouts.db");
            let db = Database::new(&db_path).expect("Failed to initialize database");
            
            app.manage(AppState { db });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_workouts,
            get_workout,
            get_workout_by_date,
            get_workout_chart_data,
            get_workout_gps_data,
            delete_workout,
            rename_workout,
            update_workout_tags,
            update_workout_notes,
            get_stats,
            get_monthly_stats,
            get_streak_info,
            get_personal_records,
            get_contribution_calendar,
            get_weekly_summary,
            get_activity_breakdown,
            get_all_tags,
            upload_fit_file,
            upload_fit_files,
            upload_fit_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

