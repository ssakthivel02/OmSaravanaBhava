# No-filler-file policy

OmSaravanaBhava releases are measured by correctness, coverage and reversibility—not by raw file count.

A release must not add files solely to reach a numerical target. Prohibited patterns include:

- duplicated copies with numeric suffixes;
- empty placeholder files;
- arbitrary one-line fragments split from a coherent module;
- repeated templates without a distinct consumer;
- generated data with no verified source or runtime use.

The governance configuration warns above 100 changed files and rejects more than 500 files. A 2,000-file browser upload would be difficult to review, easy to misplace and expensive to roll back; it is therefore outside the accepted release policy.
