#!/bin/sh

# Adapted from:
# https://github.com/pre-commit/pre-commit-hooks/blob/main/pre_commit_hooks/trailing_whitespace_fixer.py

# Remove trailing whitespace from every line in each file, in-place

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file1> [file2 ...]"
    exit 1
fi

return_code=0
for filename in "$@"; do
    if [ ! -f "$filename" ]; then
        echo "Error: Cannot read file $filename" >&2
        continue
    fi
    # Create a temp file
    temp_file=$(mktemp)
    # Remove trailing whitespace from every line
    sed 's/[[:space:]]\+$//' "$filename" > "$temp_file"
    # Only replace if changed
    if ! cmp -s "$filename" "$temp_file"; then
        mv "$temp_file" "$filename"
        echo "Fixing $filename"
        return_code=1
    else
        rm "$temp_file"
    fi

done
exit $return_code
