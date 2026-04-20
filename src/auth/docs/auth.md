# Auth API (Frontend)

**Base URL**
- `/api/v1/auth`

**Auth Mechanism**
- Session cookie: `better-auth.session_token`
- The cookie is set on successful `sign-in` and `verify-email` responses.
- Endpoints marked as "Requires session" must send cookies (use `credentials: 'include'`).

---

**POST** `/sign-up/email`
- Required body
- `name` (string)
- `email` (string)
- `password` (string, 8-128 chars)
- Optional body
- `image` (string)
- `callbackURL` (string)

**GET** `/verify-email`
- Required query
- `token` (string)
- Notes
- Sets session cookie on success.

**POST** `/sign-in/email`
- Required body
- `email` (string, valid email)
- `password` (string, 8-128 chars)
- Notes
- Sets session cookie on success.

**POST** `/resend-verify-email`
- Required body
- `email` (string, valid email)
- `password` (string, 8-128 chars)

**POST** `/sign-out`
- Requires session
- Required cookie
- `better-auth.session_token`
- Body
- None

**POST** `/request-password-reset`
- Required body
- `email` (string, valid email)

**POST** `/reset-password/:token`
- Required path param
- `token` (string)
- Required body
- `password` (string, 8-128 chars)

**POST** `/change-password`
- Requires session
- Required body
- `currentPassword` (string, 8-128 chars)
- `newPassword` (string, 8-128 chars)

**GET** `/get-session`
- Requires session
- Body
- None
