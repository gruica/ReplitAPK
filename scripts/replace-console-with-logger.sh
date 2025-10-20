#!/bin/bash

# Script to replace console.log calls with logger calls in client/src

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting console.log replacement with logger...${NC}"

# Find all .ts and .tsx files in client/src
files=$(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "logger.ts")

total_files=0
modified_files=0

for file in $files; do
  # Check if file contains console. calls
  if grep -q "console\." "$file"; then
    echo -e "${YELLOW}Processing: $file${NC}"
    total_files=$((total_files + 1))
    
    # Check if file already imports logger
    if ! grep -q "import.*logger.*from.*@/utils/logger" "$file" && ! grep -q "import.*logger.*from.*\.\./utils/logger" "$file" && ! grep -q "import.*logger.*from.*\.\./\.\./utils/logger" "$file"; then
      # Add import at the top (after other imports)
      # Find the last import line
      last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
      
      if [ -n "$last_import_line" ]; then
        # Insert after last import
        sed -i "${last_import_line}a import { logger } from '@/utils/logger';" "$file"
        echo -e "  ${GREEN}✓${NC} Added logger import"
      else
        # No imports found, add at top
        sed -i "1i import { logger } from '@/utils/logger';" "$file"
        echo -e "  ${GREEN}✓${NC} Added logger import at top"
      fi
    fi
    
    # Replace console calls with logger calls
    sed -i 's/console\.log(/logger.log(/g' "$file"
    sed -i 's/console\.info(/logger.info(/g' "$file"
    sed -i 's/console\.warn(/logger.warn(/g' "$file"
    sed -i 's/console\.error(/logger.error(/g' "$file"
    sed -i 's/console\.debug(/logger.debug(/g' "$file"
    
    modified_files=$((modified_files + 1))
    echo -e "  ${GREEN}✓${NC} Replaced console calls with logger"
  fi
done

echo -e "${GREEN}Replacement complete!${NC}"
echo -e "Files processed: $total_files"
echo -e "Files modified: $modified_files"
