import React from 'react'

interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-5">
          <p
            className="text-[#f0f0f0] text-center text-2xl"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            something broke 😭
          </p>
          <button
            className="font-mono text-accent text-sm underline underline-offset-2"
            onClick={() => window.location.reload()}
          >
            reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
