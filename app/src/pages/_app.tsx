import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { UndoRedoProvider } from '../lib/undo-redo-context'
import { AuthProvider } from '../lib/auth-context'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <UndoRedoProvider>
        <Component {...pageProps} />
      </UndoRedoProvider>
    </AuthProvider>
  )
}
