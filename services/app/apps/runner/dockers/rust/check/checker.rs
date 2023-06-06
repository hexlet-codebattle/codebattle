fn main() {

use serde_json::{Result, Value};

fn untyped_example() -> Result<()> {
    // Some JSON input data as a &str. Maybe this comes from the user.
    let data = r#"
        {
            "name": "John Doe",
            "age": 43,
            "float": 123.2,
            "map": {"nested": [1,2,3]},
            "phones": [
                "+44 1234567",
                "+44 2345678"
            ]
        }"#;

    // Parse the string of data into serde_json::Value.
    let v: Value = serde_json::from_str(data)?;

    // Access parts of the data by indexing with square brackets.
    println!("Please call {} at the number {} float {}, nested {}", v["name"], v["phones"][0], v["float"], v["map"]["nested"]);

    Ok(())
}
untyped_example();
// TODO:
// require_relative '../runner'
// parse json and call runner
// Runner.call(serde_json.parse("[[0, 1], [1, 1], [1, 0]]"))



}
