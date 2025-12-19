#!/bin/bash

# Generate changelog between two git tags or commits
# Usage: ./scripts/generate-changelog.sh [FROM_TAG] [TO_TAG]

set -e

FROM_TAG="${1:-zmNg-0.0.1}"
TO_TAG="${2:-zmNg-0.0.2}"

echo "Generating changelog from $FROM_TAG to $TO_TAG..."
echo ""

# Initialize changelog
CHANGELOG="## Changes from $FROM_TAG to $TO_TAG\n\n"

# Categorize commits
FEATURES=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^feat" --regexp-ignore-case 2>/dev/null || echo "")
FIXES=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^fix" --regexp-ignore-case 2>/dev/null || echo "")
DOCS=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^docs" --grep="^docfix" --regexp-ignore-case 2>/dev/null || echo "")
TESTS=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^test" --regexp-ignore-case 2>/dev/null || echo "")
CHORES=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^chore" --regexp-ignore-case 2>/dev/null || echo "")
REFACTORS=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --grep="^refactor" --regexp-ignore-case 2>/dev/null || echo "")

# Build changelog sections
if [ -n "$FEATURES" ]; then
  CHANGELOG="${CHANGELOG}### ✨ Features\n\n${FEATURES}\n\n"
fi

if [ -n "$FIXES" ]; then
  CHANGELOG="${CHANGELOG}### 🐛 Bug Fixes\n\n${FIXES}\n\n"
fi

if [ -n "$DOCS" ]; then
  CHANGELOG="${CHANGELOG}### 📚 Documentation\n\n${DOCS}\n\n"
fi

if [ -n "$TESTS" ]; then
  CHANGELOG="${CHANGELOG}### ✅ Tests\n\n${TESTS}\n\n"
fi

if [ -n "$REFACTORS" ]; then
  CHANGELOG="${CHANGELOG}### ♻️ Code Refactoring\n\n${REFACTORS}\n\n"
fi

if [ -n "$CHORES" ]; then
  CHANGELOG="${CHANGELOG}### 🔧 Chores\n\n${CHORES}\n\n"
fi

# Get other commits not matching the above patterns
OTHER=$(git log ${FROM_TAG}..${TO_TAG} --pretty=format:"- %s (%h)" --invert-grep \
  --grep="^feat" --grep="^fix" --grep="^docs" --grep="^test" --grep="^chore" --grep="^refactor" \
  --regexp-ignore-case 2>/dev/null || echo "")

if [ -n "$OTHER" ]; then
  CHANGELOG="${CHANGELOG}### 📝 Other Changes\n\n${OTHER}\n\n"
fi

# Output changelog
echo -e "$CHANGELOG"

# Save to file if requested
if [ "$3" = "--save" ]; then
  echo -e "$CHANGELOG" > CHANGELOG-${TO_TAG}.md
  echo ""
  echo "Changelog saved to CHANGELOG-${TO_TAG}.md"
fi
