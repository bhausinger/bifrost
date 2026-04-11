#!/usr/bin/env bash
# Check staged files for line count limits
# - Warn if file exceeds 300 lines
# - Fail if file exceeds 500 lines

MAX_LINES=500
WARN_LINES=300
has_error=0

for file in "$@"; do
  if [ ! -f "$file" ]; then
    continue
  fi

  # Skip generated files (supabase types, lock files, etc.)
  case "$file" in
    */types/supabase.ts|*.generated.*) continue ;;
  esac

  line_count=$(wc -l < "$file" | tr -d ' ')

  if [ "$line_count" -gt "$MAX_LINES" ]; then
    echo "ERROR: $file has $line_count lines (max $MAX_LINES)"
    has_error=1
  elif [ "$line_count" -gt "$WARN_LINES" ]; then
    echo "WARNING: $file has $line_count lines (recommend < $WARN_LINES)"
  fi
done

if [ "$has_error" -eq 1 ]; then
  echo ""
  echo "Files exceeding $MAX_LINES lines must be split up before committing."
  exit 1
fi

exit 0
