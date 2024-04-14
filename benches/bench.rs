#![feature(test)]

extern crate test;

use flatai::get_entries;
use flatai::get_lines; // replace with your crate name
use flatai::read_config;
use test::Bencher;

#[bench]
fn bench_get_lines(b: &mut Bencher) {
    let config = read_config().unwrap();
    let entries = get_entries("."); // replace with your directory
    b.iter(|| get_lines(&entries, None, &config));
}
