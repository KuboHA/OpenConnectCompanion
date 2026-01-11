use rusqlite::{Connection, Result, params, Row};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workout {
    pub id: i64,
    pub file_hash: String,
    pub filename: String,
    pub name: Option<String>,
    pub tags: Option<String>,
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
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutSummary {
    pub id: i64,
    pub name: Option<String>,
    pub workout_type: Option<String>,
    pub start_time: Option<String>,
    pub duration_seconds: Option<i64>,
    pub distance_meters: Option<f64>,
    pub total_calories: Option<i64>,
    pub avg_heart_rate: Option<i64>,
    pub tags: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Stats {
    pub total_workouts: i64,
    pub total_distance_km: f64,
    pub total_duration_hours: f64,
    pub total_calories: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyStats {
    pub workouts: i64,
    pub distance_km: f64,
    pub duration_seconds: i64,
    pub calories: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreakInfo {
    pub current_streak: i64,
    pub active_days: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PersonalRecords {
    pub max_distance_km: f64,
    pub max_duration_hours: f64,
    pub max_heart_rate: i64,
    pub max_speed_kmh: f64,
    pub max_elevation_gain: f64,
    pub max_calories: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContributionDay {
    pub date: String,
    pub count: i64,
    pub workout_types: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WeeklySummary {
    pub week: String,
    pub count: i64,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &Path) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        
        // Enable WAL mode for better concurrency
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
        
        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_hash TEXT UNIQUE NOT NULL,
                filename TEXT NOT NULL,
                name TEXT,
                tags TEXT,
                workout_type TEXT,
                start_time DATETIME,
                end_time DATETIME,
                duration_seconds INTEGER,
                distance_meters REAL,
                total_calories INTEGER,
                avg_heart_rate INTEGER,
                max_heart_rate INTEGER,
                avg_power_watts INTEGER,
                max_power_watts INTEGER,
                avg_cadence INTEGER,
                max_cadence INTEGER,
                avg_speed_mps REAL,
                max_speed_mps REAL,
                elevation_gain_meters REAL,
                elevation_loss_meters REAL,
                gps_data TEXT,
                sensor_data TEXT,
                chart_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Create index on common query fields
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(workout_type)",
            [],
        )?;

        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn workout_exists(&self, file_hash: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM workouts WHERE file_hash = ?",
            params![file_hash],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    pub fn insert_workout(&self, workout: &InsertWorkout) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO workouts (
                file_hash, filename, name, workout_type, start_time, end_time,
                duration_seconds, distance_meters, total_calories,
                avg_heart_rate, max_heart_rate, avg_power_watts, max_power_watts,
                avg_cadence, max_cadence, avg_speed_mps, max_speed_mps,
                elevation_gain_meters, elevation_loss_meters,
                gps_data, sensor_data, chart_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                workout.file_hash,
                workout.filename,
                workout.name,
                workout.workout_type,
                workout.start_time,
                workout.end_time,
                workout.duration_seconds,
                workout.distance_meters,
                workout.total_calories,
                workout.avg_heart_rate,
                workout.max_heart_rate,
                workout.avg_power_watts,
                workout.max_power_watts,
                workout.avg_cadence,
                workout.max_cadence,
                workout.avg_speed_mps,
                workout.max_speed_mps,
                workout.elevation_gain_meters,
                workout.elevation_loss_meters,
                workout.gps_data,
                workout.sensor_data,
                workout.chart_data,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_workouts(&self, limit: i64, offset: i64, workout_type: Option<&str>, tag: Option<&str>) -> Result<Vec<WorkoutSummary>> {
        let conn = self.conn.lock().unwrap();
        
        let mut sql = String::from(
            "SELECT id, name, workout_type, start_time, duration_seconds, distance_meters, total_calories, avg_heart_rate, tags 
             FROM workouts WHERE 1=1"
        );
        
        if workout_type.is_some() {
            sql.push_str(" AND workout_type = ?1");
        }
        if tag.is_some() {
            if workout_type.is_some() {
                sql.push_str(" AND tags LIKE ?2");
            } else {
                sql.push_str(" AND tags LIKE ?1");
            }
        }
        sql.push_str(" ORDER BY start_time DESC LIMIT ?");
        if workout_type.is_some() && tag.is_some() {
            sql.push_str("3 OFFSET ?4");
        } else if workout_type.is_some() || tag.is_some() {
            sql.push_str("2 OFFSET ?3");
        } else {
            sql.push_str("1 OFFSET ?2");
        }

        fn row_to_summary(row: &Row) -> rusqlite::Result<WorkoutSummary> {
            Ok(WorkoutSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                workout_type: row.get(2)?,
                start_time: row.get(3)?,
                duration_seconds: row.get(4)?,
                distance_meters: row.get(5)?,
                total_calories: row.get(6)?,
                avg_heart_rate: row.get(7)?,
                tags: row.get(8)?,
            })
        }

        let mut workouts = Vec::new();
        
        if let Some(wt) = workout_type {
            if let Some(t) = tag {
                let tag_pattern = format!("%\"{}%", t);
                let mut stmt = conn.prepare(&sql)?;
                let rows = stmt.query_map(params![wt, tag_pattern, limit, offset], row_to_summary)?;
                for row in rows {
                    workouts.push(row?);
                }
            } else {
                let mut stmt = conn.prepare(&sql)?;
                let rows = stmt.query_map(params![wt, limit, offset], row_to_summary)?;
                for row in rows {
                    workouts.push(row?);
                }
            }
        } else if let Some(t) = tag {
            let tag_pattern = format!("%\"{}%", t);
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map(params![tag_pattern, limit, offset], row_to_summary)?;
            for row in rows {
                workouts.push(row?);
            }
        } else {
            let mut stmt = conn.prepare(&sql)?;
            let rows = stmt.query_map(params![limit, offset], row_to_summary)?;
            for row in rows {
                workouts.push(row?);
            }
        }

        Ok(workouts)
    }

    pub fn get_workout(&self, id: i64) -> Result<Option<Workout>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, file_hash, filename, name, tags, workout_type, start_time, end_time,
                    duration_seconds, distance_meters, total_calories,
                    avg_heart_rate, max_heart_rate, avg_power_watts, max_power_watts,
                    avg_cadence, max_cadence, avg_speed_mps, max_speed_mps,
                    elevation_gain_meters, elevation_loss_meters, created_at, updated_at
             FROM workouts WHERE id = ?"
        )?;
        
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Workout {
                id: row.get(0)?,
                file_hash: row.get(1)?,
                filename: row.get(2)?,
                name: row.get(3)?,
                tags: row.get(4)?,
                workout_type: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
                duration_seconds: row.get(8)?,
                distance_meters: row.get(9)?,
                total_calories: row.get(10)?,
                avg_heart_rate: row.get(11)?,
                max_heart_rate: row.get(12)?,
                avg_power_watts: row.get(13)?,
                max_power_watts: row.get(14)?,
                avg_cadence: row.get(15)?,
                max_cadence: row.get(16)?,
                avg_speed_mps: row.get(17)?,
                max_speed_mps: row.get(18)?,
                elevation_gain_meters: row.get(19)?,
                elevation_loss_meters: row.get(20)?,
                created_at: row.get(21)?,
                updated_at: row.get(22)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_workout_chart_data(&self, id: i64) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let result: Option<String> = conn.query_row(
            "SELECT chart_data FROM workouts WHERE id = ?",
            params![id],
            |row| row.get(0),
        ).ok();
        Ok(result)
    }

    pub fn get_workout_gps_data(&self, id: i64) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let result: Option<String> = conn.query_row(
            "SELECT gps_data FROM workouts WHERE id = ?",
            params![id],
            |row| row.get(0),
        ).ok();
        Ok(result)
    }

    pub fn get_workout_by_date(&self, date: &str) -> Result<Option<Workout>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, file_hash, filename, name, tags, workout_type, start_time, end_time,
                    duration_seconds, distance_meters, total_calories,
                    avg_heart_rate, max_heart_rate, avg_power_watts, max_power_watts,
                    avg_cadence, max_cadence, avg_speed_mps, max_speed_mps,
                    elevation_gain_meters, elevation_loss_meters, created_at, updated_at
             FROM workouts WHERE DATE(start_time) = ? ORDER BY start_time ASC LIMIT 1"
        )?;
        
        let mut rows = stmt.query(params![date])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Workout {
                id: row.get(0)?,
                file_hash: row.get(1)?,
                filename: row.get(2)?,
                name: row.get(3)?,
                tags: row.get(4)?,
                workout_type: row.get(5)?,
                start_time: row.get(6)?,
                end_time: row.get(7)?,
                duration_seconds: row.get(8)?,
                distance_meters: row.get(9)?,
                total_calories: row.get(10)?,
                avg_heart_rate: row.get(11)?,
                max_heart_rate: row.get(12)?,
                avg_power_watts: row.get(13)?,
                max_power_watts: row.get(14)?,
                avg_cadence: row.get(15)?,
                max_cadence: row.get(16)?,
                avg_speed_mps: row.get(17)?,
                max_speed_mps: row.get(18)?,
                elevation_gain_meters: row.get(19)?,
                elevation_loss_meters: row.get(20)?,
                created_at: row.get(21)?,
                updated_at: row.get(22)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn delete_workout(&self, id: i64) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute("DELETE FROM workouts WHERE id = ?", params![id])?;
        Ok(affected > 0)
    }

    pub fn rename_workout(&self, id: i64, name: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE workouts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![name, id],
        )?;
        Ok(affected > 0)
    }

    pub fn update_tags(&self, id: i64, tags: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute(
            "UPDATE workouts SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            params![tags, id],
        )?;
        Ok(affected > 0)
    }

    pub fn get_stats(&self) -> Result<Stats> {
        let conn = self.conn.lock().unwrap();
        let stats = conn.query_row(
            "SELECT 
                COUNT(*) as total_workouts,
                COALESCE(SUM(distance_meters), 0) / 1000.0 as total_distance_km,
                COALESCE(SUM(duration_seconds), 0) / 3600.0 as total_duration_hours,
                COALESCE(SUM(total_calories), 0) as total_calories
             FROM workouts",
            [],
            |row| {
                Ok(Stats {
                    total_workouts: row.get(0)?,
                    total_distance_km: row.get(1)?,
                    total_duration_hours: row.get(2)?,
                    total_calories: row.get(3)?,
                })
            },
        )?;
        Ok(stats)
    }

    pub fn get_monthly_stats(&self) -> Result<MonthlyStats> {
        let conn = self.conn.lock().unwrap();
        let stats = conn.query_row(
            "SELECT 
                COUNT(*) as workouts,
                COALESCE(SUM(CASE 
                    WHEN workout_type IN ('generic', 'system', 'strength_training', 'yoga', 'training', 'fitness_equipment') THEN 0 
                    ELSE distance_meters 
                END), 0) / 1000.0 as distance_km,
                COALESCE(SUM(duration_seconds), 0) as duration_seconds,
                COALESCE(SUM(total_calories), 0) as calories
             FROM workouts
             WHERE start_time >= date('now', 'start of month')",
            [],
            |row| {
                Ok(MonthlyStats {
                    workouts: row.get(0)?,
                    distance_km: row.get(1)?,
                    duration_seconds: row.get(2)?,
                    calories: row.get(3)?,
                })
            },
        )?;
        Ok(stats)
    }

    pub fn get_streak_info(&self) -> Result<StreakInfo> {
        let conn = self.conn.lock().unwrap();
        
        // Get current streak
        let mut current_streak = 0i64;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT date(start_time) as workout_date
             FROM workouts
             WHERE start_time IS NOT NULL
             ORDER BY workout_date DESC"
        )?;
        
        let dates: Vec<String> = stmt.query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();
        
        if !dates.is_empty() {
            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            let yesterday = (chrono::Local::now() - chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
            
            // Check if streak is active (workout today or yesterday)
            if dates.first().map(|d| d == &today || d == &yesterday).unwrap_or(false) {
                let mut expected_date = if dates.first().map(|d| d == &today).unwrap_or(false) {
                    chrono::Local::now().date_naive()
                } else {
                    chrono::Local::now().date_naive() - chrono::Duration::days(1)
                };
                
                for date_str in &dates {
                    if let Ok(date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                        if date == expected_date {
                            current_streak += 1;
                            expected_date -= chrono::Duration::days(1);
                        } else if date < expected_date {
                            break;
                        }
                    }
                }
            }
        }
        
        // Get active days in last 365 days
        let active_days: i64 = conn.query_row(
            "SELECT COUNT(DISTINCT date(start_time))
             FROM workouts
             WHERE start_time >= date('now', '-365 days')",
            [],
            |row| row.get(0),
        )?;
        
        Ok(StreakInfo {
            current_streak,
            active_days,
        })
    }

    pub fn get_personal_records(&self) -> Result<PersonalRecords> {
        let conn = self.conn.lock().unwrap();
        let records = conn.query_row(
            "SELECT 
                COALESCE(MAX(distance_meters), 0) / 1000.0 as max_distance_km,
                COALESCE(MAX(duration_seconds), 0) / 3600.0 as max_duration_hours,
                COALESCE(MAX(max_heart_rate), 0) as max_heart_rate,
                COALESCE(MAX(max_speed_mps), 0) * 3.6 as max_speed_kmh,
                COALESCE(MAX(elevation_gain_meters), 0) as max_elevation_gain,
                COALESCE(MAX(total_calories), 0) as max_calories
             FROM workouts",
            [],
            |row| {
                Ok(PersonalRecords {
                    max_distance_km: row.get(0)?,
                    max_duration_hours: row.get(1)?,
                    max_heart_rate: row.get(2)?,
                    max_speed_kmh: row.get(3)?,
                    max_elevation_gain: row.get(4)?,
                    max_calories: row.get(5)?,
                })
            },
        )?;
        Ok(records)
    }

    pub fn get_contribution_calendar(&self, days: i64) -> Result<Vec<ContributionDay>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT date(start_time) as workout_date, 
                    COUNT(*) as count,
                    GROUP_CONCAT(workout_type) as types
             FROM workouts
             WHERE start_time >= date('now', ? || ' days')
             GROUP BY workout_date
             ORDER BY workout_date"
        )?;

        let days_ago = format!("-{}", days);
        let rows = stmt.query_map(params![days_ago], |row| {
            let types_str: Option<String> = row.get(2)?;
            let workout_types: Vec<String> = types_str
                .map(|s| s.split(',').map(|t| t.to_string()).collect())
                .unwrap_or_default();
            Ok(ContributionDay {
                date: row.get(0)?,
                count: row.get(1)?,
                workout_types,
            })
        })?;

        let mut calendar = Vec::new();
        for row in rows {
            calendar.push(row?);
        }
        Ok(calendar)
    }

    pub fn get_weekly_summary(&self, weeks: i64) -> Result<Vec<WeeklySummary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT strftime('%Y-W%W', start_time) as week, COUNT(*) as count
             FROM workouts
             WHERE start_time >= date('now', ? || ' days')
             GROUP BY week
             ORDER BY week"
        )?;

        let days_ago = format!("-{}", weeks * 7);
        let rows = stmt.query_map(params![days_ago], |row| {
            Ok(WeeklySummary {
                week: row.get(0)?,
                count: row.get(1)?,
            })
        })?;

        let mut summary = Vec::new();
        for row in rows {
            summary.push(row?);
        }
        Ok(summary)
    }

    pub fn get_activity_breakdown(&self) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT COALESCE(workout_type, 'unknown') as type, COUNT(*) as count
             FROM workouts
             GROUP BY workout_type
             ORDER BY count DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        let mut breakdown = Vec::new();
        for row in rows {
            breakdown.push(row?);
        }
        Ok(breakdown)
    }

    pub fn get_all_tags(&self) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT DISTINCT tags FROM workouts WHERE tags IS NOT NULL AND tags != '[]'")?;
        
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        
        let mut all_tags = std::collections::HashSet::new();
        for row in rows {
            if let Ok(tags_json) = row {
                if let Ok(tags) = serde_json::from_str::<Vec<String>>(&tags_json) {
                    for tag in tags {
                        all_tags.insert(tag);
                    }
                }
            }
        }
        
        let mut tags: Vec<String> = all_tags.into_iter().collect();
        tags.sort();
        Ok(tags)
    }

    pub fn get_total_workout_count(&self, workout_type: Option<&str>, tag: Option<&str>) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        
        let mut sql = String::from("SELECT COUNT(*) FROM workouts WHERE 1=1");
        
        if workout_type.is_some() {
            sql.push_str(" AND workout_type = ?");
        }
        if tag.is_some() {
            sql.push_str(" AND tags LIKE ?");
        }

        if let Some(wt) = workout_type {
            if let Some(t) = tag {
                let tag_pattern = format!("%\"{}%", t);
                conn.query_row(&sql, params![wt, tag_pattern], |row| row.get(0))
            } else {
                conn.query_row(&sql, params![wt], |row| row.get(0))
            }
        } else if let Some(t) = tag {
            let tag_pattern = format!("%\"{}%", t);
            conn.query_row(&sql, params![tag_pattern], |row| row.get(0))
        } else {
            conn.query_row(&sql, [], |row| row.get(0))
        }
    }
}

#[derive(Debug)]
pub struct InsertWorkout {
    pub file_hash: String,
    pub filename: String,
    pub name: Option<String>,
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
    pub gps_data: Option<String>,
    pub sensor_data: Option<String>,
    pub chart_data: Option<String>,
}
