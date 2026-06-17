import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

function DummyComponent() {
  return <div data-testid="dummy">Oculide Dummy</div>
}

describe('Dummy Test', () => {
  it('renders a dummy component', () => {
    render(<DummyComponent />)
    expect(screen.getByTestId('dummy')).toBeInTheDocument()
  })
})
