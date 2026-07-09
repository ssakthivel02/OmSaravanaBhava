Batch-43 Dynamic Loader Fix
Root cause: inline page init ran before JS loaded in some Batch-42 pages.
Fix: pages now use body data-module and DOMContentLoaded in assets/js/osb43.js.
Test: /index-production-v4.html /temples.html /temple-details.html?id=vadapalani /sloka-reader.html?id=kanda-sashti-kavasam /ai-search.html?q=vadapalani
Do not overwrite index.html until v4 is verified.
