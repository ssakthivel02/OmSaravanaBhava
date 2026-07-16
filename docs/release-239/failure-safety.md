# Failure Safety

The publisher stops before commit if the remote base moved, a deletion target is
missing, a staged status differs from the manifest, a test fails or governance
fails. The temporary clone is retained for diagnosis; the production branch is
unchanged until the final push succeeds.
