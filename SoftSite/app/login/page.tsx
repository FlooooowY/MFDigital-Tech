import { ParticleBackground } from '@/components/auth/ParticleBackground'
import { LoginForm } from '@/components/auth/LoginForm'
import { DemoAccounts } from '@/components/auth/DemoAccounts'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <ParticleBackground />
      
      <div className="w-full max-w-md z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold gradient-text mb-2 text-shadow-lg">
            Agency
          </h1>
          <p className="text-text-500 text-lg">
            Система управления агентством
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 animated-border">
          <LoginForm />
        </div>

        {/* Demo Accounts */}
        <div className="mt-6">
          <DemoAccounts />
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-text-500 text-sm">
          <p>© 2025 Agency Management System</p>
          <p className="mt-2">
            Защищено шифрованием AES-256
          </p>
        </div>
      </div>
    </main>
  )
}

