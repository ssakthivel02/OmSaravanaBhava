# Why Atomic Publishing

GitHub browser upload cannot delete files omitted from an archive. Release 238
was therefore committed with its final title while its manifest remained in
bootstrap state and all deletion targets remained tracked. Release 239 performs
copy, deletion, validation and commit in one local Git transaction.
