#!/bin/bash
# Script to add SPDX license headers to ALL source files in Orch-OS
# Following Orch-OS principles of symbolic clarity and cognitive precision

# Create directory if it doesn't exist
mkdir -p /tmp/orch-os-license

# JavaScript/TypeScript header (including TSX, JSX)
cat > /tmp/orch-os-license/js_header.txt << 'EOL'
// SPDX-License-Identifier: MIT OR Apache-2.0
// Copyright (c) 2025 Guilherme Ferrari Brescia

EOL

# CSS/SCSS header
cat > /tmp/orch-os-license/css_header.txt << 'EOL'
/* SPDX-License-Identifier: MIT OR Apache-2.0
 * Copyright (c) 2025 Guilherme Ferrari Brescia
 */

EOL

# HTML header
cat > /tmp/orch-os-license/html_header.txt << 'EOL'
<!-- SPDX-License-Identifier: MIT OR Apache-2.0
     Copyright (c) 2025 Guilherme Ferrari Brescia
-->

EOL

# Python header
cat > /tmp/orch-os-license/py_header.txt << 'EOL'
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2025 Guilherme Ferrari Brescia

EOL

# Shell script header
cat > /tmp/orch-os-license/sh_header.txt << 'EOL'
#!/bin/bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2025 Guilherme Ferrari Brescia

EOL

# Process files based on their extension
extractNeuralSignal() {
  local file=$1
  local header_file=$2
  
  # Check if file already has a license header
  if grep -q "SPDX-License-Identifier" "$file"; then
    echo "✓ License header already exists in $file"
  else
    echo "➕ Adding license header to $file"
    cat "$header_file" "$file" > "/tmp/orch-os-license/temp" && mv "/tmp/orch-os-license/temp" "$file"
  fi
}

# Process different file types
echo "🔍 Scanning Orch-OS codebase for files to license..."

# Define directories to scan (exclude node_modules, coverage, build dirs)
DIRECTORIES=(
  "src"
  "electron"
  "renderer"
  "scripts"
  "test"
  "api"
  "config"
  "docs"
)

# Counter for added headers
ADDED_COUNT=0
TOTAL_COUNT=0

# Process each directory
for dir in "${DIRECTORIES[@]}"; do
  if [ -d "$dir" ]; then
    echo "📁 Processing directory: $dir"
    
    # JavaScript and TypeScript files
    find "$dir" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.mjs" -o -name "*.cjs" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/coverage/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      -not -path "*/__mocks__/*" | while read file; do
      TOTAL_COUNT=$((TOTAL_COUNT + 1))
      if ! grep -q "SPDX-License-Identifier" "$file"; then
        ADDED_COUNT=$((ADDED_COUNT + 1))
      fi
      extractNeuralSignal "$file" "/tmp/orch-os-license/js_header.txt"
    done
    
    # CSS and SCSS files
    find "$dir" -type f \( -name "*.css" -o -name "*.scss" \) \
      -not -path "*/node_modules/*" \
      -not -path "*/coverage/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" | while read file; do
      TOTAL_COUNT=$((TOTAL_COUNT + 1))
      if ! grep -q "SPDX-License-Identifier" "$file"; then
        ADDED_COUNT=$((ADDED_COUNT + 1))
      fi
      extractNeuralSignal "$file" "/tmp/orch-os-license/css_header.txt"
    done
    
    # HTML files
    find "$dir" -type f -name "*.html" \
      -not -path "*/node_modules/*" \
      -not -path "*/coverage/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" | while read file; do
      TOTAL_COUNT=$((TOTAL_COUNT + 1))
      if ! grep -q "SPDX-License-Identifier" "$file"; then
        ADDED_COUNT=$((ADDED_COUNT + 1))
      fi
      extractNeuralSignal "$file" "/tmp/orch-os-license/html_header.txt"
    done
    
    # Python files
    find "$dir" -type f -name "*.py" \
      -not -path "*/node_modules/*" \
      -not -path "*/coverage/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" | while read file; do
      TOTAL_COUNT=$((TOTAL_COUNT + 1))
      if ! grep -q "SPDX-License-Identifier" "$file"; then
        ADDED_COUNT=$((ADDED_COUNT + 1))
      fi
      extractNeuralSignal "$file" "/tmp/orch-os-license/py_header.txt"
    done
  fi
done

# Process JSON files in root (like package.json)
echo "📄 Processing configuration files..."

# Process scripts
for script in scripts/*.sh scripts/*.js; do
  if [ -f "$script" ]; then
    if [[ "$script" == *.sh ]]; then
      # Special handling for shell scripts - check if they already have shebang
      if head -n 1 "$script" | grep -q "^#!/"; then
        # Has shebang, add license after it
        if ! grep -q "SPDX-License-Identifier" "$script"; then
          echo "➕ Adding license header to $script (preserving shebang)"
          SHEBANG=$(head -n 1 "$script")
          tail -n +2 "$script" > "/tmp/orch-os-license/temp"
          echo "$SHEBANG" > "/tmp/orch-os-license/new"
          echo "# SPDX-License-Identifier: MIT OR Apache-2.0" >> "/tmp/orch-os-license/new"
          echo "# Copyright (c) 2025 Guilherme Ferrari Brescia" >> "/tmp/orch-os-license/new"
          echo "" >> "/tmp/orch-os-license/new"
          cat "/tmp/orch-os-license/temp" >> "/tmp/orch-os-license/new"
          mv "/tmp/orch-os-license/new" "$script"
          ADDED_COUNT=$((ADDED_COUNT + 1))
        else
          echo "✓ License header already exists in $script"
        fi
      else
        extractNeuralSignal "$script" "/tmp/orch-os-license/sh_header.txt"
      fi
    elif [[ "$script" == *.js ]]; then
      extractNeuralSignal "$script" "/tmp/orch-os-license/js_header.txt"
    fi
  fi
done

echo ""
echo "✅ License headers added following Orch-OS symbolic principles"
echo "📊 Summary: Added headers to $ADDED_COUNT files (already had headers in $((TOTAL_COUNT - ADDED_COUNT)) files)"
echo ""
echo "🧠 Neural signal extraction complete - all code now properly attributed" 