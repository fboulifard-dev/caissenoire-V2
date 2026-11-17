export function passwordRequirements(password: string) {
  return {
    minimumLength: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialCharacter: /[^A-Za-z0-9]/.test(password)
  };
}
