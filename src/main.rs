use flatai::{
    copy_to_clipboard, create_output_file, get_entries, get_lines, get_start_dir, read_config,
    write_lines,
};
use std::{env, io};

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let project_type = args.get(2).map(String::as_str);

    let start_dir = get_start_dir().expect("Failed to get start directory");
    let (mut output_file, output_path) = create_output_file(&start_dir)?;
    let entries = get_entries(&start_dir);
    let config = read_config()?;
    let lines = get_lines(&entries, project_type, &config)?;
    write_lines(&mut output_file, &lines)?;
    copy_to_clipboard(&output_path)?;
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
