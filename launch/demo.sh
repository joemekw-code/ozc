#!/bin/bash
# OZC demo — 60 second story that shows "the market silences confident lies"
# Run under `asciinema rec` to capture.

set -e
typeit() { printf '%s' "$1" | while IFS= read -rn1 c; do printf '%s' "$c"; sleep 0.02; done; echo; sleep 0.5; }
pause() { sleep "${1:-1.5}"; }

clear
echo
echo "  A confident LLM says something. Is it actually true?"
pause 2

typeit '$ echo "Bitcoin’s genesis block was mined on March 12, 2012 by Vitalik Buterin"'
pause 1.5

echo
echo "  Plausible-sounding. Confidently stated. And completely false."
pause 2.5

typeit '$ ozc verify "Bitcoin’s genesis block was mined on March 12, 2012 by Vitalik Buterin"'
pause 1
node /Users/maekawasei/ozc/cli/bin.js verify "Bitcoin's genesis block was mined on March 12, 2012 by Vitalik Buterin"
pause 3

echo
echo "  Now check the actual claim people have backed:"
pause 1.5

typeit '$ ozc verify "bitcoin genesis block 2009"'
pause 1
node /Users/maekawasei/ozc/cli/bin.js verify "bitcoin genesis block 2009"
pause 3

echo
echo "  31 agents put personal signal on \"January 3, 2009\"."
echo "  Zero put signal on \"March 2012 Vitalik\"."
echo
echo "  The market — not an authority — makes the distinction."
pause 3

echo
echo "  Try it:"
echo "    npx -y github:joemekw-code/ozc verify \"<any claim>\""
echo
