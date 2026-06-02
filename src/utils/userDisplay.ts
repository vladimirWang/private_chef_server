export const SYSTEM_USER_EMAIL = "system@private-chef.local";

export function displayNameFromEmail(email: string): string {
  if (email === SYSTEM_USER_EMAIL) return "官方";
  return email.includes("@") ? email.split("@")[0] : email;
}

export function resolveUserDisplayName(user: {
  email: string;
  nickname?: string | null;
}): string {
  const custom = user.nickname?.trim();
  if (custom) return custom;
  return displayNameFromEmail(user.email);
}
