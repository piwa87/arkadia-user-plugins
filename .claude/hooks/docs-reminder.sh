#!/bin/bash
# PreToolUse hook (Write|Edit): injects the repo's coding conventions into the
# agent's context the FIRST time it edits plugin source in a session, so the
# rules are read before code is written without re-reading the full docs.
# Silent for non-plugin files and for every subsequent edit in the session.
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
case "$file" in
  */src/plugins/* | */src/lib/*) ;;
  *) exit 0 ;;
esac
sid=$(printf '%s' "$input" | jq -r '.session_id // "unknown"')
marker="${TMPDIR:-/tmp}/claude-arkadia-rules-$sid"
[ -f "$marker" ] && exit 0
touch "$marker"
cat << 'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"arkadia-user-plugins conventions (shown once per session): (1) Phrase triggers MUST use registerTokenGate (src/lib/registerTokenGate.ts) — a bare api.triggers.register fails test/trigger-budget.test.ts. (2) destroy() must removeByTag every trigger tag and events.off every listener — the client does NOT auto-clean those; in core-plugin add new tags to TRIGGER_TAGS in index.ts (destroy.test.ts enforces). (3) Entry *-plugin.ts wrappers must export BOTH init and destroy. (4) Drive trigger tests through runLine from test/helpers/mockApi.ts, never pattern.test() lookups. (5) Before using an unfamiliar api.* namespace, read ONLY the matching section of the reference in src/instructions/ — grep the '##' headings first instead of reading whole files. Full rules: TRIGGERS_REFERENCE.md RULE #1."}}
EOF
