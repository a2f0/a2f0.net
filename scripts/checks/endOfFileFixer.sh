#!/bin/sh

# Adapted from:
# https://github.com/pre-commit/pre-commit-hooks/blob/main/pre_commit_hooks/end_of_file_fixer.py

fix_file() {
    file="$1"

    # Check if file exists and is readable/writable
    if [ ! -f "$file" ] || [ ! -r "$file" ] || [ ! -w "$file" ]; then
        return 0
    fi

    # Get file size
    size=$(wc -c < "$file")
    if [ "$size" -eq 0 ]; then
        return 0
    fi

    # Read last character using tail
    last_char=$(tail -c 1 "$file")

    # Check if last character is not a newline
    if [ "$last_char" != "" ] && [ "$last_char" != "$(printf '\n')" ] && [ "$last_char" != "$(printf '\r')" ]; then
        printf '\n' >> "$file"
        printf 'Fixing %s\n' "$file"
        return 0
    fi

    # Count trailing newlines (LF, CR, or CRLF)
    trailing=$(tail -c 1024 "$file" | od -An -tx1 | tr -d ' \n' | sed 's/.*[^0d0a]\([0d0a]*\)$/\1/')
    trailing_length=$(printf '%s' "$trailing" | wc -c)
    trailing_length=$((trailing_length / 2))  # Each byte is 2 hex digits

    # If file ends with more than one newline sequence
    if [ "$trailing_length" -gt 2 ] || { [ "$trailing_length" -eq 2 ] && [ "$trailing" != "0a" ] && [ "$trailing" != "0d0a" ]; }; then
        # Calculate position to truncate (remove extra newlines)
        new_size=$((size - trailing_length / 2))
        if [ "$new_size" -eq 0 ]; then
            : > "$file"  # Empty the file if only newlines
        else
            # Use dd to truncate file (POSIX way)
            dd if="$file" of="$file.tmp" bs=1 count="$new_size" 2>/dev/null
            mv "$file.tmp" "$file"
        fi
        printf 'Fixing %s\n' "$file"
        return 0
    fi

    return 0
}

main() {
    # Process each file argument
    for file in "$@"; do
        fix_file "$file"
    done

    return 0
}

# Check if script is being run directly
if [ -n "$1" ]; then
    main "$@"
    exit $?
else
    printf 'Usage: %s file1 [file2 ...]\n' "$0" >&2
    exit 1
fi
