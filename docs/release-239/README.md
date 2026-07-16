# Release 239

Release 239 replaces the failed browser-finalizer pattern with a single atomic
fresh-clone publisher. One command verifies the exact Release 238 base, copies
declared files, deletes fourteen tracked artifacts, validates, commits the exact
title and pushes.
