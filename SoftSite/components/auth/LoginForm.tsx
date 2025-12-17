'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction } from '@/app/login/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      className="w-full" 
      loading={pending}
      disabled={pending}
    >
      Войти
    </Button>
  )
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await loginAction(formData)
    
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Вход в систему</h2>
        <p className="text-text-500 text-sm">
          Введите ваши учетные данные
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="your@email.com"
          required
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Пароль"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            name="remember"
            className="w-4 h-4 rounded border-primary-500/30 bg-background-800/50 text-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <span className="text-text-300">Запомнить меня</span>
        </label>

        <button 
          type="button"
          className="text-primary-500 hover:text-primary-400 transition-colors"
        >
          Забыли пароль?
        </button>
      </div>

      <SubmitButton />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-500/20"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background-card px-2 text-text-500">Или</span>
        </div>
      </div>

      <Button 
        type="button" 
        variant="glass" 
        className="w-full"
        onClick={() => {
          // TODO: Implement Telegram OAuth
          alert('Telegram OAuth будет реализован в следующей версии')
        }}
      >
        <svg 
          className="w-5 h-5" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 3.767-1.359 5.001-.168.521-.5.695-.818.714-.695.063-1.223-.459-1.898-.9-.937-.613-1.467-1.002-2.381-1.605-.975-.645-.344-1.002.213-1.584.145-.154 2.676-2.452 2.724-2.662.006-.027.011-.124-.046-.176s-.149-.034-.213-.02c-.09.02-1.533.974-4.327 2.857-.41.281-.781.418-1.114.411-.366-.008-1.07-.207-1.593-.377-.641-.209-1.15-.319-1.106-.673.023-.184.277-.372.762-.564 2.984-1.302 4.973-2.162 5.963-2.579 2.841-1.18 3.429-1.385 3.813-1.392.085-.001.274.02.397.122.104.086.133.201.146.283.014.083.031.271.018.419z"/>
        </svg>
        Войти через Telegram
      </Button>
    </form>
  )
}

