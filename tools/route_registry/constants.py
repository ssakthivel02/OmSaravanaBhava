"""Route-registry constants."""

ALLOWED_STATUSES = frozenset({"partial-reviewed", "source-register", "navigation"})
REQUIRED_BOUNDARY_FIELDS = frozenset({
    "route", "declaredRouteStatus", "verifiedStatus", "sourceDataPath",
    "pageRobots", "fullTextPublished", "readingEligible", "contentScope",
    "evidenceMarker",
})
REQUIRED_OVERRIDE_FIELDS = frozenset({
    "path", "status", "summary", "publicationStatusPrevious",
    "publicationStatusCanonical", "publicationStatusSource",
    "publicationBoundaryRelease", "readingEligible", "fullTextPublished",
    "sourceDataPath", "pageRobots", "evidenceMarker",
})
DEFAULT_SOURCE_PATH = "/data/publication-boundaries.json"
DEFAULT_HISTORICAL_REGISTRY = "/data/site-routes.json"
