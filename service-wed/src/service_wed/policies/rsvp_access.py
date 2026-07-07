# RECOMMENDED DELETE: never implemented as a separate policy layer. The
# checks this describes (RSVP window open, token resolves to a household,
# still within the edit window) are all inline in
# RsvpService.submit_rsvp() (services/rsvp.py), the same place the rest of
# that use case's logic lives. Nothing imports this module.
# RSVP window open? token resovles to this household? still editable?
