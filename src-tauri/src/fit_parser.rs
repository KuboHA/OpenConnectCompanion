use fitparser::{self, FitDataRecord, Value};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::fs;
use std::path::Path;
use chrono::{DateTime, Utc, TimeZone};
use log::{debug, info};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpsPoint {
    pub timestamp: Option<String>,
    pub lat: f64,
    pub lon: f64,
    pub altitude: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SensorPoint {
    pub timestamp: Option<String>,
    pub heart_rate: Option<i64>,
    pub power: Option<i64>,
    pub cadence: Option<i64>,
    pub speed: Option<f64>,
    pub distance: Option<f64>,
    pub altitude: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChartData {
    pub timestamps: Vec<String>,
    pub heart_rate: Vec<Option<i64>>,
    pub power: Vec<Option<i64>>,
    pub cadence: Vec<Option<i64>>,
    pub speed: Vec<Option<f64>>,
    pub altitude: Vec<Option<f64>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ParsedFitData {
    pub file_hash: String,
    pub filename: String,
    pub workout_type: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub duration_seconds: Option<i64>,
    pub distance_meters: Option<f64>,
    pub total_calories: Option<i64>,
    pub avg_heart_rate: Option<i64>,
    pub max_heart_rate: Option<i64>,
    pub avg_power_watts: Option<i64>,
    pub max_power_watts: Option<i64>,
    pub avg_cadence: Option<i64>,
    pub max_cadence: Option<i64>,
    pub avg_speed_mps: Option<f64>,
    pub max_speed_mps: Option<f64>,
    pub elevation_gain_meters: Option<f64>,
    pub elevation_loss_meters: Option<f64>,
    pub gps_data: Vec<GpsPoint>,
    pub sensor_data: Vec<SensorPoint>,
    pub chart_data: ChartData,
}

// FIT timestamp epoch is December 31, 1989, 00:00:00 UTC
const FIT_EPOCH_OFFSET: i64 = 631065600;

fn fit_timestamp_to_datetime(timestamp: u32) -> DateTime<Utc> {
    Utc.timestamp_opt(timestamp as i64 + FIT_EPOCH_OFFSET, 0).unwrap()
}

fn semicircles_to_degrees(semicircles: i32) -> f64 {
    semicircles as f64 * (180.0 / 2_147_483_648.0)
}

fn get_field_value<'a>(record: &'a FitDataRecord, field_name: &str) -> Option<&'a Value> {
    record.fields().iter()
        .find(|f| f.name() == field_name)
        .map(|f| f.value())
}

fn value_to_i64(value: &Value) -> Option<i64> {
    match value {
        Value::SInt8(v) => Some(*v as i64),
        Value::UInt8(v) => Some(*v as i64),
        Value::SInt16(v) => Some(*v as i64),
        Value::UInt16(v) => Some(*v as i64),
        Value::SInt32(v) => Some(*v as i64),
        Value::UInt32(v) => Some(*v as i64),
        Value::SInt64(v) => Some(*v),
        Value::UInt64(v) => Some(*v as i64),
        _ => None,
    }
}

fn value_to_f64(value: &Value) -> Option<f64> {
    match value {
        Value::Float32(v) => Some(*v as f64),
        Value::Float64(v) => Some(*v),
        Value::SInt8(v) => Some(*v as f64),
        Value::UInt8(v) => Some(*v as f64),
        Value::SInt16(v) => Some(*v as f64),
        Value::UInt16(v) => Some(*v as f64),
        Value::SInt32(v) => Some(*v as f64),
        Value::UInt32(v) => Some(*v as f64),
        Value::SInt64(v) => Some(*v as f64),
        Value::UInt64(v) => Some(*v as f64),
        _ => None,
    }
}

fn value_to_timestamp(value: &Value) -> Option<DateTime<Utc>> {
    match value {
        // fitparser often returns timestamps as DateTime<Local> in Timestamp variant
        Value::Timestamp(dt) => Some(dt.with_timezone(&Utc)),
        // Or as raw u32 (FIT epoch seconds)
        Value::UInt32(v) => Some(fit_timestamp_to_datetime(*v)),
        Value::SInt32(v) => Some(fit_timestamp_to_datetime(*v as u32)),
        _ => None,
    }
}

fn sport_to_string(sport_num: u8) -> String {
    match sport_num {
        0 => "generic".to_string(),
        1 => "running".to_string(),
        2 => "cycling".to_string(),
        3 => "transition".to_string(),
        4 => "fitness_equipment".to_string(),
        5 => "swimming".to_string(),
        6 => "basketball".to_string(),
        7 => "soccer".to_string(),
        8 => "tennis".to_string(),
        9 => "american_football".to_string(),
        10 => "training".to_string(),
        11 => "walking".to_string(),
        12 => "cross_country_skiing".to_string(),
        13 => "alpine_skiing".to_string(),
        14 => "snowboarding".to_string(),
        15 => "rowing".to_string(),
        16 => "mountaineering".to_string(),
        17 => "hiking".to_string(),
        18 => "multisport".to_string(),
        19 => "paddling".to_string(),
        20 => "strength_training".to_string(),
        _ => format!("sport_{}", sport_num),
    }
}

#[allow(dead_code)]
pub fn compute_file_hash(file_path: &Path) -> Result<String, String> {
    let data = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    Ok(hex::encode(hasher.finalize()))
}

pub fn parse_fit_file(file_path: &Path) -> Result<ParsedFitData, String> {
    info!("Parsing FIT file: {:?}", file_path);
    
    let file_data = fs::read(file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let file_hash = {
        let mut hasher = Sha256::new();
        hasher.update(&file_data);
        hex::encode(hasher.finalize())
    };

    let filename = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let records = fitparser::from_bytes(&file_data)
        .map_err(|e| format!("Failed to parse FIT file: {}", e))?;

    info!("Parsed {} records from FIT file", records.len());

    // Debug: collect all unique record kinds
    let mut record_kinds: std::collections::HashSet<String> = std::collections::HashSet::new();
    for record in &records {
        record_kinds.insert(record.kind().to_string());
    }
    info!("Record kinds found: {:?}", record_kinds);

    let mut workout_type: Option<String> = None;
    let mut start_time: Option<DateTime<Utc>> = None;
    let mut end_time: Option<DateTime<Utc>> = None;
    let mut duration_seconds: Option<i64> = None;
    let mut distance_meters: Option<f64> = None;
    let mut total_calories: Option<i64> = None;
    let mut avg_heart_rate: Option<i64> = None;
    let mut max_heart_rate: Option<i64> = None;
    let mut avg_power: Option<i64> = None;
    let mut max_power: Option<i64> = None;
    let mut avg_cadence: Option<i64> = None;
    let mut max_cadence: Option<i64> = None;
    let mut avg_speed: Option<f64> = None;
    let mut max_speed: Option<f64> = None;
    let mut elevation_gain: Option<f64> = None;
    let mut elevation_loss: Option<f64> = None;

    let mut gps_data: Vec<GpsPoint> = Vec::new();
    let mut sensor_data: Vec<SensorPoint> = Vec::new();
    let mut altitudes: Vec<f64> = Vec::new();

    for record in &records {
        let kind = record.kind().to_string();
        
        match kind.as_str() {
            "sport" => {
                debug!("Found sport record");
                // Get sport type - can be string or numeric
                if let Some(val) = get_field_value(record, "sport") {
                    match val {
                        Value::String(s) => {
                            workout_type = Some(s.to_lowercase());
                            debug!("Sport (string): {}", s);
                        }
                        Value::UInt8(n) => {
                            workout_type = Some(sport_to_string(*n));
                            debug!("Sport (uint8): {} -> {}", n, sport_to_string(*n));
                        }
                        _ => {
                            debug!("Sport has unexpected type: {:?}", val);
                        }
                    }
                }
            }
            "session" => {
                debug!("Found session record with {} fields", record.fields().len());
                
                // Log all fields for debugging
                for field in record.fields() {
                    debug!("  Session field: {} = {:?}", field.name(), field.value());
                }
                
                // Get sport type from session if not already set
                if workout_type.is_none() {
                    if let Some(val) = get_field_value(record, "sport") {
                        match val {
                            Value::String(s) => {
                                workout_type = Some(s.to_lowercase());
                            }
                            Value::UInt8(n) => {
                                workout_type = Some(sport_to_string(*n));
                            }
                            _ => {}
                        }
                    }
                }

                // Start time
                if let Some(val) = get_field_value(record, "start_time") {
                    if let Some(ts) = value_to_timestamp(val) {
                        start_time = Some(ts);
                        debug!("Start time: {:?}", start_time);
                    }
                }
                
                // End time (timestamp field in session)
                if let Some(val) = get_field_value(record, "timestamp") {
                    if let Some(ts) = value_to_timestamp(val) {
                        end_time = Some(ts);
                        debug!("End time: {:?}", end_time);
                    }
                }
                
                // Duration - fitparser returns this in seconds as f64
                if let Some(val) = get_field_value(record, "total_elapsed_time") {
                    if let Some(t) = value_to_f64(val) {
                        // The value is in seconds (not ms)
                        duration_seconds = Some(t as i64);
                        debug!("Duration (elapsed): {} seconds", t);
                    }
                }
                if duration_seconds.is_none() {
                    if let Some(val) = get_field_value(record, "total_timer_time") {
                        if let Some(t) = value_to_f64(val) {
                            duration_seconds = Some(t as i64);
                            debug!("Duration (timer): {} seconds", t);
                        }
                    }
                }
                
                // Distance - fitparser returns this in meters
                if let Some(val) = get_field_value(record, "total_distance") {
                    if let Some(d) = value_to_f64(val) {
                        // Value is already in meters
                        distance_meters = Some(d);
                        debug!("Distance: {} meters", d);
                    }
                }
                
                // Calories
                if let Some(val) = get_field_value(record, "total_calories") {
                    total_calories = value_to_i64(val);
                    debug!("Calories: {:?}", total_calories);
                }
                
                // Heart rate
                if let Some(val) = get_field_value(record, "avg_heart_rate") {
                    avg_heart_rate = value_to_i64(val);
                }
                if let Some(val) = get_field_value(record, "max_heart_rate") {
                    max_heart_rate = value_to_i64(val);
                }
                
                // Power
                if let Some(val) = get_field_value(record, "avg_power") {
                    avg_power = value_to_i64(val);
                }
                if let Some(val) = get_field_value(record, "max_power") {
                    max_power = value_to_i64(val);
                }
                
                // Cadence
                if let Some(val) = get_field_value(record, "avg_cadence") {
                    avg_cadence = value_to_i64(val);
                }
                if let Some(val) = get_field_value(record, "max_cadence") {
                    max_cadence = value_to_i64(val);
                }
                
                // Speed - fitparser returns in m/s
                if let Some(val) = get_field_value(record, "avg_speed") {
                    avg_speed = value_to_f64(val);
                    debug!("Avg speed: {:?} m/s", avg_speed);
                }
                if let Some(val) = get_field_value(record, "max_speed") {
                    max_speed = value_to_f64(val);
                }
                // Try enhanced speed if regular not available
                if avg_speed.is_none() {
                    if let Some(val) = get_field_value(record, "enhanced_avg_speed") {
                        avg_speed = value_to_f64(val);
                    }
                }
                if max_speed.is_none() {
                    if let Some(val) = get_field_value(record, "enhanced_max_speed") {
                        max_speed = value_to_f64(val);
                    }
                }
                
                // Elevation from session (total_ascent/descent)
                if let Some(val) = get_field_value(record, "total_ascent") {
                    elevation_gain = value_to_f64(val);
                    debug!("Elevation gain: {:?}", elevation_gain);
                }
                if let Some(val) = get_field_value(record, "total_descent") {
                    elevation_loss = value_to_f64(val);
                }
            }
            "record" => {
                // Extract timestamp
                let timestamp = get_field_value(record, "timestamp")
                    .and_then(|v| value_to_timestamp(v))
                    .map(|ts| ts.to_rfc3339());

                // Extract GPS data - position values are in semicircles
                let lat = get_field_value(record, "position_lat")
                    .and_then(|v| value_to_i64(v))
                    .map(|v| semicircles_to_degrees(v as i32));
                let lon = get_field_value(record, "position_long")
                    .and_then(|v| value_to_i64(v))
                    .map(|v| semicircles_to_degrees(v as i32));
                
                // Altitude - already in meters from fitparser
                let altitude = get_field_value(record, "altitude")
                    .or_else(|| get_field_value(record, "enhanced_altitude"))
                    .and_then(|v| value_to_f64(v));

                if let (Some(lat_val), Some(lon_val)) = (lat, lon) {
                    if lat_val.abs() <= 90.0 && lon_val.abs() <= 180.0 {
                        gps_data.push(GpsPoint {
                            timestamp: timestamp.clone(),
                            lat: lat_val,
                            lon: lon_val,
                            altitude,
                        });
                    }
                }

                if let Some(alt) = altitude {
                    altitudes.push(alt);
                }

                // Extract sensor data
                let heart_rate = get_field_value(record, "heart_rate")
                    .and_then(|v| value_to_i64(v));
                let power = get_field_value(record, "power")
                    .and_then(|v| value_to_i64(v));
                let cadence = get_field_value(record, "cadence")
                    .and_then(|v| value_to_i64(v));
                    
                // Speed - already in m/s
                let speed = get_field_value(record, "speed")
                    .or_else(|| get_field_value(record, "enhanced_speed"))
                    .and_then(|v| value_to_f64(v));
                    
                // Distance - already in meters
                let distance = get_field_value(record, "distance")
                    .and_then(|v| value_to_f64(v));

                sensor_data.push(SensorPoint {
                    timestamp,
                    heart_rate,
                    power,
                    cadence,
                    speed,
                    distance,
                    altitude,
                });
            }
            "activity" => {
                debug!("Found activity record");
                // Activity record can also have sport type
                if workout_type.is_none() {
                    if let Some(val) = get_field_value(record, "type") {
                        match val {
                            Value::String(s) => {
                                workout_type = Some(s.to_lowercase());
                            }
                            Value::UInt8(n) => {
                                workout_type = Some(sport_to_string(*n));
                            }
                            _ => {}
                        }
                    }
                }
            }
            "lap" => {
                // Lap records can provide data if session is missing
                if start_time.is_none() {
                    if let Some(val) = get_field_value(record, "start_time") {
                        if let Some(ts) = value_to_timestamp(val) {
                            start_time = Some(ts);
                        }
                    }
                }
            }
            _ => {}
        }
    }

    // Calculate elevation gain/loss from records if not in session
    if elevation_gain.is_none() || elevation_loss.is_none() {
        let (calc_gain, calc_loss) = calculate_elevation_changes(&altitudes);
        if elevation_gain.is_none() {
            elevation_gain = calc_gain;
        }
        if elevation_loss.is_none() {
            elevation_loss = calc_loss;
        }
    }

    // Build chart data
    let chart_data = build_chart_data(&sensor_data);

    info!(
        "Parsed workout: type={:?}, duration={:?}s, distance={:?}m, calories={:?}, hr={:?}/{:?}, gps_points={}, sensor_points={}",
        workout_type, duration_seconds, distance_meters, total_calories,
        avg_heart_rate, max_heart_rate, gps_data.len(), sensor_data.len()
    );

    Ok(ParsedFitData {
        file_hash,
        filename,
        workout_type,
        start_time: start_time.map(|t| t.to_rfc3339()),
        end_time: end_time.map(|t| t.to_rfc3339()),
        duration_seconds,
        distance_meters,
        total_calories,
        avg_heart_rate,
        max_heart_rate,
        avg_power_watts: avg_power,
        max_power_watts: max_power,
        avg_cadence,
        max_cadence,
        avg_speed_mps: avg_speed,
        max_speed_mps: max_speed,
        elevation_gain_meters: elevation_gain,
        elevation_loss_meters: elevation_loss,
        gps_data,
        sensor_data,
        chart_data,
    })
}

fn calculate_elevation_changes(altitudes: &[f64]) -> (Option<f64>, Option<f64>) {
    if altitudes.len() < 2 {
        return (None, None);
    }

    let mut gain = 0.0;
    let mut loss = 0.0;
    let threshold = 2.0; // Minimum change to count (reduces noise)

    for window in altitudes.windows(2) {
        let diff = window[1] - window[0];
        if diff > threshold {
            gain += diff;
        } else if diff < -threshold {
            loss += diff.abs();
        }
    }

    (Some(gain), Some(loss))
}

fn build_chart_data(sensor_data: &[SensorPoint]) -> ChartData {
    // Downsample if needed (LTTB algorithm simplified)
    let max_points = 1000;
    let step = if sensor_data.len() > max_points {
        sensor_data.len() / max_points
    } else {
        1
    };

    let mut timestamps = Vec::new();
    let mut heart_rate = Vec::new();
    let mut power = Vec::new();
    let mut cadence = Vec::new();
    let mut speed = Vec::new();
    let mut altitude = Vec::new();

    for (i, point) in sensor_data.iter().enumerate() {
        if i % step == 0 {
            timestamps.push(point.timestamp.clone().unwrap_or_default());
            heart_rate.push(point.heart_rate);
            power.push(point.power);
            cadence.push(point.cadence);
            speed.push(point.speed);
            altitude.push(point.altitude);
        }
    }

    ChartData {
        timestamps,
        heart_rate,
        power,
        cadence,
        speed,
        altitude,
    }
}
