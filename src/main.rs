use std::env;
use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let start_dir = args.get(1).expect("Usage: flatten_files <directory>");

    // Output file will be created in the provided directory
    let output_path = Path::new(&start_dir).join("flattened_files.txt");
    let mut output_file = File::create(&output_path)?;

    for entry in WalkDir::new(&start_dir) {
        let entry = entry.expect("Error walking the directory");
        let path = entry.path();
        if path.is_file() && 
           (path.extension().map_or(false, |ext| ext == "rs") || 
            path.file_name().map_or(false, |name| name == "Cargo.toml")) {
            let content = fs::read_to_string(path)?;
            let relative_path = path.strip_prefix(&start_dir).unwrap_or(path);
            writeln!(output_file, "---- File: {} ----\n{}", relative_path.display(), content)?;
        }
    }

    println!("Files have been flattened into {}", output_path.display());

    Ok(())
}
