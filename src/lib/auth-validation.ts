export type AuthFormState = { error?: string; message?: string };

export function validateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function validateCredentials(email: unknown, password: unknown, registering = false) {
  const normalized = validateEmail(email);
  if (!normalized || typeof password !== "string" || password.length < (registering ? 12 : 1) || password.length > 128) return null;
  return { email: normalized, password };
}

export function safeAuthNext(value: unknown): string {
  return typeof value === "string" && /^\/(?:profile|collection|explore|artwork\/[1-9]\d{0,8})$/.test(value) ? value : "/profile";
}

export function authErrorMessage(code?: string, status?: number): string {
  if (status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return "Bandymų per daug. Palauk ir bandyk vėliau.";
  if (code === "invalid_credentials") return "Nepavyko prisijungti. Patikrink el. paštą ir slaptažodį.";
  if (code === "email_not_confirmed") return "Pirmiausia patvirtink el. paštą pagal gautą laišką.";
  return "Paskyros užklausos užbaigti nepavyko. Pabandyk vėliau.";
}
