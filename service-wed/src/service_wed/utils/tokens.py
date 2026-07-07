# RECOMMENDED DELETE: empty. Token generation actually happens inline where
# it's needed -- secrets.token_urlsafe() in services/auth.py (session
# tokens) and services/guest_list.py (invite tokens) -- rather than through
# a shared helper here. Nothing imports this module.
