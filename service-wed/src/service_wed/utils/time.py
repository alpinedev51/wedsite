# RECOMMENDED DELETE: empty, and every call site that needs a timestamp uses
# dt.datetime.now(dt.timezone.utc) inline instead of a shared helper here.
# Nothing imports this module.
