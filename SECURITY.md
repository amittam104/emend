# Security policy

The initial `0.1.x` preview is the supported release line after publication.
Emend requires explicit review before applying AI proposals; it does not replace
application authentication, authorization, rate limits, or provider safeguards.

Report vulnerabilities privately using
[GitHub private vulnerability reporting](https://github.com/amittam104/emend/security/advisories/new).
If that option is unavailable, contact the maintainer privately through the
[GitHub profile](https://github.com/amittam104). Do not include secrets or exploit
details in public issues. No fixed response time is promised for this preview.

Keep provider keys on the server. Authenticate and authorize every AI request,
validate request limits, and review generated content before acceptance. Store
editor content and chat history according to your application's privacy policy.
