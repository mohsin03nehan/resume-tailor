import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TailorPage from '../page'

const chatState = vi.hoisted(() => ({
  value: {},
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => chatState.value),
}))

describe('TailorPage', () => {
  afterEach(cleanup)

  beforeAll(() => {
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  beforeEach(() => {
    chatState.value = {
      messages: [],
      sendMessage: vi.fn(),
      regenerate: vi.fn(),
      clearError: vi.fn(),
      error: null,
      status: 'ready',
      stop: vi.fn(),
    }
  })

  test('renders example prompts and fills the input when one is clicked', async () => {
    const user = userEvent.setup()
    render(createElement(TailorPage))

    expect(screen.getByText("Start by describing the job you're applying for")).toBeInTheDocument()
    const prompt = "I'm a frontend developer applying for a React role"
    await user.click(screen.getByRole('button', { name: prompt }))

    expect(screen.getByPlaceholderText('Paste job description and ask for a tailored cover letter...')).toHaveValue(prompt)
  })

  test('renders a user message bubble from text parts', () => {
    chatState.value.messages = [
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'I am applying for a frontend role.' }],
      },
    ]

    render(createElement(TailorPage))

    expect(screen.getByText('I am applying for a frontend role.')).toBeInTheDocument()
  })

  test('renders an assistant message bubble from text parts', () => {
    chatState.value.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Highlight your React experience.' }],
      },
    ]

    render(createElement(TailorPage))

    expect(screen.getByText('Highlight your React experience.')).toBeInTheDocument()
  })

  test.each(['streaming', 'submitted'])('shows the assistant loading skeleton while status is %s', (status) => {
    chatState.value = {
      ...chatState.value,
      status,
      messages: [{ id: 'assistant-1', role: 'assistant', parts: [] }],
    }

    render(createElement(TailorPage))

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  test('shows an error banner and retries through the mocked regenerate function', async () => {
    const user = userEvent.setup()
    const regenerate = vi.fn().mockResolvedValue(undefined)
    chatState.value = { ...chatState.value, error: new Error('Request failed'), regenerate }
    render(createElement(TailorPage))

    expect(screen.getByText('Something went wrong sending that message.')).toBeInTheDocument()
    const errorBanner = screen.getByText('Something went wrong sending that message.').parentElement
    await user.click(within(errorBanner).getByRole('button', { name: 'Retry' }))

    expect(regenerate).toHaveBeenCalledOnce()
  })

  test('renders a completed Job Match card from a tool result part', () => {
    chatState.value.messages = [
      {
        id: 'assistant-tool-1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-analyzeJobMatch',
            state: 'output-available',
            output: {
              matchScore: 80,
              matchedSkills: ['React', 'JavaScript'],
              missingSkills: ['TypeScript'],
              suggestedBullets: ['Built reusable React components.'],
            },
          },
        ],
      },
    ]

    render(createElement(TailorPage))

    expect(screen.getByText('Job match')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Built reusable React components.')).toBeInTheDocument()
  })

  test('shows Send when idle, a nameless loading button while submitted, and Retry on error', () => {
    const { rerender } = render(createElement(TailorPage))

    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()

    chatState.value = { ...chatState.value, status: 'submitted' }
    rerender(createElement(TailorPage))
    const loadingButton = screen.getByRole('button', { name: 'Send' })
    expect(loadingButton).toBeDisabled()
    expect(loadingButton).toHaveTextContent('Send')

    chatState.value = { ...chatState.value, status: 'ready', error: new Error('Request failed') }
    rerender(createElement(TailorPage))
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2)
  })
})
