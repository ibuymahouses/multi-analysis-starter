import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { UndoRedoProvider } from '../lib/undo-redo-context'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UndoRedoProvider>
      <Component {...pageProps} />
    </UndoRedoProvider>
  )
}
