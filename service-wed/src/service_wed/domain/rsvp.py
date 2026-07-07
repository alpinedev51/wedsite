# RECOMMENDED DELETE: never implemented. There is no separate RSVP state
# machine -- RsvpService.submit_rsvp() in services/rsvp.py upserts
# RsvpResponse rows directly, and RsvpStatus (domain/value_objects.py) is a
# flat enum, not a transition graph. Nothing imports this module.
# RsvpResponse entity + RSVP/guest state machine + transitions
