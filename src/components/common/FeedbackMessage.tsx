type FeedbackMessageProps = {
  tone: 'error' | 'success'
  message: string
}

export function FeedbackMessage({ tone, message }: FeedbackMessageProps) {
  return <p className={`${tone === 'error' ? 'hero-error' : 'hero-success'} access-feedback${tone === 'success' ? ' success' : ''}`}>{message}</p>
}
