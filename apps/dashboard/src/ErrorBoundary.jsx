import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Panel error:', error, info)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border p-5 text-sm flex items-center justify-between gap-3 mb-4"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-dim)' }}
        >
          <span>{this.props.label || 'Something went wrong in this panel.'}</span>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 rounded border shrink-0 hover:opacity-80 transition-opacity"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {this.props.retryLabel || 'Retry'}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
