#!/bin/sh

# https://github.com/pre-commit/pre-commit-hooks/blob/main/pre_commit_hooks/trailing_whitespace_fixer.py

# Function to process a single line
process_line() {
    line="$1"
    
    # Detect line ending
    if echo "$line" | grep -q '\r\n$'; then
        eol='\r\n'
        line=$(echo "$line" | sed 's/\r\n$//')
    elif echo "$line" | grep -q '\n$'; then
        eol='\n'
        line=$(echo "$line" | sed 's/\n$//')
    else
        eol=''
    fi
    
    # Remove trailing whitespace
    echo "$line" | sed 's/[[:space:]]*$//' | tr -d '\n'
    echo -n "$eol"
}

# Function to fix a file
fix_file() {
    filename="$1"
    
    # Read file content
    if ! [ -r "$filename" ]; then
        echo "Error: Cannot read file $filename" >&2
        return 1
    fi
    
    # Create temporary file
    temp_file=$(mktemp)
    changed=0
    
    # Process file line by line
    while IFS= read -r line || [ -n "$line" ]; do
        processed=$(process_line "$line")
        echo "$processed" >> "$temp_file"
    done < "$filename"
    
    # Compare original and processed files
    if ! cmp -s "$filename" "$temp_file"; then
        mv "$temp_file" "$filename"
        changed=1
    else
        rm "$temp_file"
    fi
    
    return $changed
}

# Parse arguments
files=""

while [ $# -gt 0 ]; do
    case "$1" in
        *)
            files="$files $1"
            shift
            ;;
    esac
done

# Process files
return_code=0
for filename in $files; do
    if fix_file "$filename"; then
        echo "Fixing $filename"
        return_code=1
    fi
done

exit $return_code
