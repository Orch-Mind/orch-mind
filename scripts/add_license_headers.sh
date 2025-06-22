#!/bin/bash
# SPDX-License-Identifier: MIT OR Apache-2.0
# Copyright (c) 2025 Guilherme Ferrari Brescia
# Script to add SPDX license headers to source files
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

# JavaScript and TypeScript files
find src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) | while read file; do
  extractNeuralSignal "$file" "/tmp/orch-os-license/js_header.txt"
done

# CSS and SCSS files
find src -type f \( -name "*.css" -o -name "*.scss" \) | while read file; do
  extractNeuralSignal "$file" "/tmp/orch-os-license/css_header.txt"
done

# HTML files
find src -type f -name "*.html" | while read file; do
  extractNeuralSignal "$file" "/tmp/orch-os-license/html_header.txt"
done

# Python files
find src -type f -name "*.py" | while read file; do
  extractNeuralSignal "$file" "/tmp/orch-os-license/py_header.txt"
done

echo "✅ License headers added following Orch-OS symbolic principles"
