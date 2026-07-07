# RECOMMENDED DELETE: never implemented, and nothing needs it. Every service
# that needs the current time calls dt.datetime.now(dt.timezone.utc)
# directly (see services/rsvp.py, services/campaigns.py, etc.) rather than
# going through an injected ClockPort. That's a real gap if this codebase
# grows tests that need to freeze/travel time, but there are no tests yet
# (out of scope for now) -- until then this is an abstraction with no
# consumer. Nothing imports this module.
# ClockPort (now) - testable time
