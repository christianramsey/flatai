
![Project Logo](logo.webp)

flatai is a Rust-based tool designed to equip a language model (LLM) with "just enough codebase awareness" to assist you in problem-solving. Currently, it's a brute force operation that works exclusively with Rust projects, but optimization are planned weekly.

flatai prepares your codebase for AI analysis by traversing a given directory and consolidating all `.rs`, and `Cargo.toml` files (py and js/ts coming soon) into a single XML-formatted text file. This approach simplifies the parsing and analysis process for AI tools, as they can process a single, comprehensive file instead of numerous smaller ones.

Please note that flatai is a work in progress. Future update will include ability to use flatai as an agent that you pass a question to and it regularly updates your contect file for use with LLMs (currently supporting anthropic's claude and openai's gpt).

![Flatten Files Output](screenshot.png)


## Features to Add 🚀

Here are some features we're planning to add in the future:

- **Compress Your Repo**: We're planning to add a feature that will compress your repository for easier handling and storage.

- **Optimize Based on Your Question**: We're working on a feature that will take a question or problem as an argument and optimize the code based on your question and all files in the repository.

- **Support for JavaScript/TypeScript and Python**: We're planning to add support for more languages, including JavaScript/TypeScript and Python.

- **Provide Just Enough Codebase Context**: The output will be improved to provide just enough codebase context to answer your question.

- **Vector Index of Packages**: We're planning to pull in the packages you are using and create a vector index of packages. This will allow you to reference specific parts of the question more easily.


## Table of Contents 📑

- [Installation](#installation)
- [Usage](#usage)
- [Upcoming Features](#upcoming-features)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Installation ⚙️

To install FLAT.AI, clone the repository and run `cargo build --release` to compile the Rust code. This will create a binary named `flatai`.


### Use Executable 
To use the included executable, simply download the binary file from the repository and move it to your desired directory.

1. Download the `flatai` binary from the repository.
2. Open your terminal and navigate to the directory where the binary is located.
3. Use the `mv` command to move the binary to your desired directory. For example:
    ```sh
    mv flatai /desired/directory/
    ```
    Replace `/desired/directory/` with the actual path to your desired directory.


To add the `flatai` binary to your path, add the following line to your `~/.bashrc` or `~/.zshrc` file:

```sh
export PATH="$PATH:/path/to/your/project/target/release"
```

Replace /path/to/your/project with the actual path to your project. After adding this line, run source ~/.bashrc or source ~/.zshrc to apply the changes.

Now, you can run the flatai command from any directory in your terminal.


```sh
flatai . 
```

```sh
flatai target/dir
```


## Output File 📄
After running FLAT.AI, a file named `flatten_files.txt` will be created in the current directory. This file contains the consolidated code from all the `.rs`, `.py`, `.js`, and `Cargo.toml` files in the directory.

Here is an example screenshot of the `flatten_files.txt` file:

![Flatten Files Output](screenshot.png)

You can use this file for AI analysis and RAG (retrieval augmented generation).



## Contact 📞

You can reach out to me on Twitter at [@fanli_x](https://twitter.com/fanli_x).

