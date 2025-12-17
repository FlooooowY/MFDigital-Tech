import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Пароль должен содержать минимум 8 символов')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Пароль должен содержать строчные буквы')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Пароль должен содержать заглавные буквы')
  }

  if (!/\d/.test(password)) {
    errors.push('Пароль должен содержать цифры')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Пароль должен содержать специальные символы')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

