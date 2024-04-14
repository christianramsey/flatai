use chrono::offset::Utc;
use chrono::DateTime;
use clipboard::ClipboardContext;
use clipboard::ClipboardProvider;
use rayon::prelude::*;
use serde::Deserialize;
use std::collections::HashSet;
use std::env;
use std::ffi::OsStr;
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Deserialize)]
pub struct Config {
    general_files: Vec<String>,
    projects: Vec<Project>,
}

#[derive(Deserialize)]
struct Project {
    project_type: String,
    file_types: Vec<String>,
    file_names: Vec<String>,
}

pub fn read_config_from_str(config_str: &str) -> Result<Config, std::io::Error> {
    let config = serde_json::from_str(config_str)
        .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))?;
    Ok(config)
}

pub fn read_config() -> Result<Config, std::io::Error> {
    let config_str = fs::read_to_string("config.json")?;
    read_config_from_str(&config_str)
}

pub fn get_start_dir() -> Result<String, &'static str> {
    let args: Vec<String> = env::args().collect();
    args.get(1)
        .ok_or("Usage: flatten_files <directory>")
        .map(|s| s.to_string())
}

pub fn create_output_file(start_dir: &str) -> io::Result<(File, PathBuf)> {
    let output_path = PathBuf::from(start_dir).join("flattened_files.txt");
    let output_file = File::create(&output_path)?;
    Ok((output_file, output_path))
}

pub fn get_entries(start_dir: &str) -> Vec<walkdir::DirEntry> {
    WalkDir::new(start_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect::<Vec<_>>()
}

pub fn read_file(path: &Path) -> io::Result<Vec<String>> {
    let metadata = fs::metadata(path)?;
    if metadata.len() < 1_000_000 {
        let content = fs::read_to_string(path)?;
        Ok(content.lines().map(String::from).collect())
    } else {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        Ok(reader.lines().filter_map(Result::ok).collect())
    }
}

pub fn get_lines(
    entries: &[walkdir::DirEntry],
    project_type: Option<&str>,
    config: &Config,
) -> Result<Vec<String>, std::io::Error> {
    // ... (rest of the function remains the same)
    let (file_types, file_names) = match project_type {
        Some(project_type) => {
            let project_config = config
                .projects
                .iter()
                .find(|project| project.project_type == project_type)
                .ok_or_else(|| {
                    std::io::Error::new(
                        std::io::ErrorKind::Other,
                        "Project type not found in configuration",
                    )
                })?;
            (
                project_config
                    .file_types
                    .clone()
                    .into_iter()
                    .collect::<HashSet<_>>(),
                project_config
                    .file_names
                    .clone()
                    .into_iter()
                    .collect::<HashSet<_>>(),
            )
        }
        None => {
            let file_types: HashSet<String> = config
                .projects
                .iter()
                .flat_map(|project| &project.file_types)
                .cloned()
                .collect();
            let file_names: HashSet<String> = config
                .projects
                .iter()
                .flat_map(|project| &project.file_names)
                .cloned()
                .collect();
            (file_types, file_names)
        }
    };

    let general_files: HashSet<_> = config.general_files.iter().cloned().collect();
    let file_names = file_names
        .union(&general_files)
        .cloned()
        .collect::<HashSet<_>>();

    entries
        .par_iter()
        .filter_map(|entry| {
            let path = entry.path();
            if path.is_file()
                && (file_types.contains(path.extension().and_then(OsStr::to_str).unwrap_or(""))
                    || file_names.contains(path.file_name().and_then(OsStr::to_str).unwrap_or("")))
            {
                let file_lines = match read_file(path) {
                    Ok(lines) => lines,
                    Err(_) => return None,
                };
                let metadata = fs::metadata(path).ok()?;
                let modified_time = metadata.modified().ok()?;
                let datetime: DateTime<Utc> = modified_time.into();
                let mut result = vec![format!(
                    "<file name=\"{}\" last_modified=\"{}\">",
                    path.display(),
                    datetime.to_rfc3339()
                )];
                result.extend(file_lines);
                result.push("</file>".to_string());
                Some(Ok(result))
            } else {
                None
            }
        })
        .collect::<Result<Vec<_>, _>>()
        .map(|lines| lines.concat())
}

pub fn write_lines(output_file: &mut File, lines: &[String]) -> io::Result<()> {
    for line in lines {
        writeln!(output_file, "{}", line)?;
    }
    Ok(())
}

pub fn copy_to_clipboard(output_path: &PathBuf) -> io::Result<()> {
    let mut ctx: ClipboardContext = ClipboardProvider::new().unwrap();
    let content = fs::read_to_string(output_path)?;
    ctx.set_contents(content).unwrap();
    Ok(())
}
