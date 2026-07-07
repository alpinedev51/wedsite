# RECOMMENDED DELETE: never implemented. Household/Guest invariants (e.g.
# plus-one handling) live directly in services/guest_list.py and the
# SQLAlchemy models (models/household.py, models/guest.py), not in a
# separate pure-domain layer. Nothing imports this module.
# Household + Guest entities; plus-one invariants
