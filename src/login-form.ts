import type { ClientPrincipal } from "./types.js";

export function loginFormHtml(
	provider: string,
	cookieName: string,
	defaultUser?: ClientPrincipal,
): string {
	const d: ClientPrincipal = {
		identityProvider: defaultUser?.identityProvider ?? provider,
		userId: defaultUser?.userId ?? crypto.randomUUID(),
		userDetails: defaultUser?.userDetails ?? "",
		userRoles: defaultUser?.userRoles ?? ["anonymous", "authenticated"],
		claims: defaultUser?.claims ?? [],
	};

	const rolesValue = d.userRoles.join("\n");
	const claimsValue =
		d.claims.length > 0 ? JSON.stringify(d.claims, null, 2) : "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Auth — Login</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      padding: 2rem;
      width: 100%;
      max-width: 480px;
    }
    h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    p.subtitle { margin: 0 0 1.5rem; color: #666; font-size: 0.875rem; }
    label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
    input, textarea {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.875rem;
      margin-bottom: 1rem;
      font-family: inherit;
    }
    textarea { resize: vertical; min-height: 80px; }
    button {
      width: 100%;
      padding: 0.6rem;
      background: #0078d4;
      color: #fff;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #106ebe; }
    .error { color: #c00; font-size: 0.8rem; margin-top: -0.75rem; margin-bottom: 0.75rem; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Dev Auth</h1>
    <p class="subtitle">Local authentication emulator — fill in fake user identity</p>
    <form id="auth-form">
      <label for="identityProvider">Identity Provider</label>
      <input id="identityProvider" name="identityProvider" type="text" value="${escapeHtml(d.identityProvider)}" placeholder="e.g. aad, github, google" required />

      <label for="userId">User ID</label>
      <input id="userId" name="userId" type="text" value="${escapeHtml(d.userId)}" placeholder="UUID" required />

      <label for="userDetails">User Details (email or username)</label>
      <input id="userDetails" name="userDetails" type="text" value="${escapeHtml(d.userDetails)}" placeholder="user@example.com" required />

      <label for="userRoles">Roles (one per line)</label>
      <textarea id="userRoles" name="userRoles" placeholder="anonymous&#10;authenticated">${escapeHtml(rolesValue)}</textarea>

      <label for="claims">Claims (JSON array, optional)</label>
      <textarea id="claims" name="claims" placeholder='[{"typ":"name","val":"Jane Doe"}]'>${escapeHtml(claimsValue)}</textarea>
      <div class="error" id="claims-error">Claims must be a valid JSON array.</div>

      <button type="submit">Login</button>
    </form>
  </div>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var redirectUri = params.get("post_login_redirect_uri") || "/";

      document.getElementById("auth-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var form = e.target;
        var claimsRaw = form.claims.value.trim();
        var claims = [];
        if (claimsRaw) {
          try {
            claims = JSON.parse(claimsRaw);
            if (!Array.isArray(claims)) {
              throw new Error("Claims must be a JSON array");
            }
          } catch (_) {
            document.getElementById("claims-error").style.display = "block";
            return;
          }
        }
        document.getElementById("claims-error").style.display = "none";

        var roles = form.userRoles.value.split("\\n").map(function(r) { return r.trim(); }).filter(Boolean);
        if (!roles.includes("anonymous")) roles.push("anonymous");
        if (!roles.includes("authenticated")) roles.push("authenticated");

        var principal = {
          identityProvider: form.identityProvider.value.trim(),
          userId: form.userId.value.trim(),
          userDetails: form.userDetails.value.trim(),
          userRoles: roles,
          claims: claims,
        };

        var principalJson = JSON.stringify(principal);
        var utf8Bytes = new TextEncoder().encode(principalJson);
        var binary = "";
        for (var i = 0; i < utf8Bytes.length; i++) {
          binary += String.fromCharCode(utf8Bytes[i]);
        }
        var encoded = btoa(binary);
        document.cookie = "${cookieName}=" + encoded + "; path=/";
        window.location.href = redirectUri;
      });
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
