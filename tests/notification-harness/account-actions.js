export async function updateAccountProfile(data) { return window.testAction("profile", Object.fromEntries(data)); }
export async function updateAccountPassword(data) { return window.testAction("password", Object.fromEntries(data)); }
export async function updateAccountAvatar(data) { return window.testAction("avatar", data); }
export async function removeAccountAvatar() { throw new Error("Not used in this test"); }
