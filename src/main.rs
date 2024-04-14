use chrono::offset::Utc;
use chrono::DateTime;
use clipboard::ClipboardContext;
use clipboard::ClipboardProvider;
use rayon::prelude::*;
use std::env;
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Write};
use std::path::PathBuf;
use walkdir::WalkDir;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let start_dir = args.get(1).expect("Usage: flatten_files <directory>");

    let output_path = PathBuf::from(start_dir).join("flattened_files.txt");
    let mut output_file = File::create(&output_path)?;

    let entries: Vec<_> = WalkDir::new(start_dir)
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    let lines: Vec<String> = entries
        .par_iter()
        .filter_map(|entry| {
            let path = entry.path();
            if path.is_file()
                && (path.extension().map_or(false, |ext| ext == "rs")
                    || path.file_name().map_or(false, |name| name == "Cargo.toml"))
            {
                let file = File::open(path).unwrap();
                let reader = BufReader::new(file);
                let _metadata = fs::metadata(path).unwrap();
                let metadata = fs::metadata(path).unwrap();
                let modified_time = metadata.modified().unwrap();
                let datetime: DateTime<Utc> = modified_time.into(); // convert SystemTime to DateTime
                let _file_lines = vec![format!(
                    "<file name=\"{}\" last_modified=\"{}\">",
                    path.display(),
                    datetime.to_rfc3339() // format DateTime as a string
                )];
                let modified_time = metadata.modified().unwrap();
                let datetime: DateTime<Utc> = modified_time.into(); // convert SystemTime to DateTime
                let mut file_lines = vec![format!(
                    "<file name=\"{}\" last_modified=\"{}\">",
                    path.display(),
                    datetime.to_rfc3339() // format DateTime as a string
                )];
                file_lines.extend(reader.lines().filter_map(Result::ok));
                file_lines.push("</file>".to_string());
                Some(file_lines)
            } else {
                None
            }
        })
        .flatten()
        .collect();

    for line in lines {
        writeln!(output_file, "{}", line)?;
    }

    let mut ctx: ClipboardContext = ClipboardProvider::new().unwrap();
    let content = fs::read_to_string(&output_path)?;
    ctx.set_contents(content).unwrap();

    println!(
        "🎉 Files have been flattened into {}! 🎉",
        output_path.display()
    );
    if env::var("CARGO_PKG_NAME").is_ok() {
        let release_executable_path = env::current_exe()?
            .parent()
            .unwrap()
            .parent()
            .unwrap()
            .join("release");
        if !release_executable_path.exists() {
            println!("Executable not found at {:?}", release_executable_path);
            println!("Please run 'cargo build --release' to build the executable.");
            return Ok(());
        }
        let zshrc_command = format!(
            "echo 'export PATH=\"{}:$PATH\"' >> ~/.zshrc",
            release_executable_path.display()
        );
        println!("Add the following command to your ~/.zshrc file:");
        println!("{}", zshrc_command);
    }
    Ok(())
}
