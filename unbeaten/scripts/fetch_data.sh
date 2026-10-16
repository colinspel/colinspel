#!/usr/bin/env bash
# Downloads only Leverkusen's 34 Bundesliga 2023-24 matches from StatsBomb open data (~390 MB) into data/
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
git clone --depth 1 --filter=blob:none --sparse https://github.com/statsbomb/open-data.git "$tmp/od"
cd "$tmp/od"
git sparse-checkout set --no-cone /data/competitions.json /data/matches/9/281.json
ids=$(python3 -c "import json;print(' '.join(str(m['match_id']) for m in json.load(open('data/matches/9/281.json'))))")
paths="/data/matches/9/281.json"
for i in $ids; do paths="$paths /data/events/$i.json /data/lineups/$i.json /data/three-sixty/$i.json"; done
git sparse-checkout set --no-cone $paths
cd - >/dev/null
mkdir -p data && cp -r "$tmp/od/data/"{events,lineups,three-sixty,matches} data/
rm -rf "$tmp"
echo "Downloaded $(ls data/events | wc -l) matches"
