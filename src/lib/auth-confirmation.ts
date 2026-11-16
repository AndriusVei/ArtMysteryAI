type AuthConfirmationClient = {
  exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
  verifyOtp: (value: { token_hash: string; type: "email" | "signup" }) => Promise<{ error: unknown }>;
};

/** PKCE kodas palaiko numatytą tiekėjo laišką; token_hash – individualų SMTP šabloną. */
export async function confirmAuthRequest(params: URLSearchParams, auth: AuthConfirmationClient): Promise<boolean> {
  if (params.has("error") || params.has("error_code")) return false;
  const code = params.get("code"), token = params.get("token_hash"), type = params.get("type");
  const valid = (value: string | null): value is string => Boolean(value) && value!.length >= 8 && value!.length <= 2048 && !/[\s\u0000-\u001f\u007f]/.test(value!);
  if (code) {
    if (params.getAll("code").length !== 1 || params.has("token_hash") || params.has("type") || !valid(code)) return false;
    return !(await auth.exchangeCodeForSession(code)).error;
  }
  if (!valid(token) || params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1 || (type !== "email" && type !== "signup")) return false;
  return !(await auth.verifyOtp({ token_hash: token, type })).error;
}
