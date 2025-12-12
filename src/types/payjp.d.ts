interface PayjpCardChangeEvent {
  error?: {
    message?: string
  }
}

interface PayjpCardElement {
  mount(selector: string): void
  unmount(): void
  on(event: 'ready' | 'change', handler: (event: PayjpCardChangeEvent) => void): void
}

interface PayjpElements {
  create(type: 'card', options?: Record<string, unknown>): PayjpCardElement
}

interface PayjpInstance {
  elements(): PayjpElements
  createToken(
    element: PayjpCardElement,
    options?: { name?: string }
  ): Promise<{ id?: string; error?: { message?: string } }>
}

interface PayjpConstructor {
  (publicKey: string): PayjpInstance
}

interface Window {
  Payjp?: PayjpConstructor
}
