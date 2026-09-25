#!/bin/sh
# Records the Linux session screenshots in CI for the pushed state of the current branch
# and downloads them into test/e2e/__golden__/. Push first; commit the result.
set -e
ref=$(git rev-parse --abbrev-ref HEAD)
gh workflow run record-linux-snapshots --ref "$ref"
sleep 8
id=$(gh run list --workflow record-linux-snapshots --branch "$ref" -L1 --json databaseId -q '.[0].databaseId')
gh run watch "$id" --exit-status > /dev/null
gh run download "$id" -n linux-snapshots -D test/e2e/__golden__
echo "downloaded Linux snapshots from run $id"
