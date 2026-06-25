"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ logout: true }),
    });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
    >
      Sign out
    </button>
  );
}
