# RECOMMENDED DELETE: never implemented. Field-level visibility is handled
# by the read schemas themselves (schemas/invitation.py's InvitationResponse/
# InvitationGuestDetail only expose read-only fields by construction), not
# by a separate policy module. Nothing imports this module.
# which status fields are exposed read-only
