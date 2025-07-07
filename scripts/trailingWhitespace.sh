#!/bin/sh

# https://github.com/pre-commit/pre-commit-hooks/blob/main/pre_commit_hooks/trailing_whitespace_fixer.py

# Function to process a single line
process_line() {
    line="$1"
    is_markdown="$2"
    chars="$3"
    
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
    
    # Convert chars to sed pattern (if provided)
    if [ -n "$chars" ]; then
        strip_pattern=$(echo "$chars" | sed 's/[][^$.*\\]/\\&/g')
    else
        strip_pattern='[[:space:]]'
    fi
    
    # Preserve trailing two-space for non-blank lines in markdown files
    if [ "$is_markdown" = "true" ] && [ -n "$(echo "$line" | grep '[^[:space:]]')" ] && echo "$line" | grep -q '  $'; then
        echo "$line" | sed "s/${strip_pattern}*  $//" | tr -d '\n'
        echo -n "  $eol"
    else
        echo "$line" | sed "s/${strip_pattern}*$//" | tr -d '\n'
        echo -n "$eol"
    fi
}

# Function to fix a file
fix_file() {
    filename="$1"
    is_markdown="$2"
    chars="$3"
    
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
        processed=$(process_line "$line" "$is_markdown" "$chars")
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
markdown_exts=""
all_markdown=false
chars=""
files=""
no_markdown_linebreak_ext=false

while [ $# -gt 0 ]; do
    case "$1" in
        --no-markdown-linebreak-ext)
            no_markdown_linebreak_ext=true
            shift
            ;;
        --markdown-linebreak-ext=*)
            markdown_exts=$(echo "$1" | sed 's/--markdown-linebreak-ext=//')
            shift
            ;;
        --chars=*)
            chars=$(echo "$1" | sed 's/--chars=//')
            shift
            ;;
        *)
            files="$files $1"
            shift
            ;;
    esac
done

# Handle --no-markdown-linebreak-ext
if [ "$no_markdown_linebreak_ext" = "true" ]; then
    echo "--no-markdown-linebreak-ext now does nothing!"
fi

# Validate markdown extensions
if echo "$markdown_exts" | grep -q '^$'; then
    echo "Error: --markdown-linebreak-ext requires a non-empty argument" >&2
    exit 1
fi

if echo "$markdown_exts" | grep -q '\*'; then
    all_markdown=true
fi

# Normalize extensions
md_exts=$(echo "$markdown_exts" | tr ',' '\n' | sed 's/^\.*//; s/^/./' | tr '[:upper:]' '[:lower:]')

# Validate extensions
for ext in $md_exts; do
    if echo "$ext" | grep -q '[.\/\\:]'; then
        echo "Error: bad --markdown-linebreak-ext extension '$ext' (has . / \\ :)" >&2
        echo "  (probably filename; use '--markdown-linebreak-ext=EXT')" >&2
        exit 1
    fi
done

# Process files
return_code=0
for filename in $files; do
    extension=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/.*\(\.[^.]*\)$/\1/')
    is_markdown=false
    
    if [ "$all_markdown" = "true" ] || echo "$md_exts" | grep -q "^${extension}$"; then
        is_markdown=true
    fi
    
    if fix_file "$filename" "$is_markdown" "$chars"; then
        echo "Fixing $filename"
        return_code=1
    fi
done

exit $return_code
