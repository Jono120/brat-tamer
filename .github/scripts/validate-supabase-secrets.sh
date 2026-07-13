#!/usr/bin/env bash
# Validates Supabase CLI secrets for GitHub Actions.
# Usage: validate-supabase-secrets.sh production|staging
set -euo pipefail

MODE="${1:?usage: validate-supabase-secrets.sh production|staging}"
missing=0

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "::error::SUPABASE_ACCESS_TOKEN secret is not set."
  missing=1
elif ! echo "$SUPABASE_ACCESS_TOKEN" | grep -Eq '^sbp_(oauth_)?[a-f0-9]{40}$'; then
  echo "::error::SUPABASE_ACCESS_TOKEN must be a Personal Access Token from https://supabase.com/dashboard/account/tokens (format: sbp_ followed by 40 hex characters). Project keys such as sb_publishable_..., sb_secret_..., anon, or service_role keys will not work."
  missing=1
fi

if [ "$MODE" = "staging" ]; then
  if [ -z "${SUPABASE_STAGING_PROJECT_ID:-}" ]; then
    echo "::error::SUPABASE_STAGING_PROJECT_ID secret is not set."
    missing=1
  fi
  if [ -z "${SUPABASE_STAGING_DB_PASSWORD:-}" ]; then
    echo "::error::SUPABASE_STAGING_DB_PASSWORD secret is not set."
    missing=1
  fi
else
  if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
    echo "::error::SUPABASE_PROJECT_ID secret is not set. Use the project ref from Project Settings → General."
    missing=1
  fi
  if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
    echo "::error::SUPABASE_DB_PASSWORD secret is not set. Use the database password from Project Settings → Database."
    missing=1
  fi
fi

exit "$missing"
