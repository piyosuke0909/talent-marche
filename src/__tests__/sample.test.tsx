import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Sample Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2)
    })

    it('should render a component', () => {
        render(<div data-testid="test">Hello Vitest</div>)
        expect(screen.getByTestId('test')).toBeDefined()
        expect(screen.getByText('Hello Vitest')).toBeDefined()
    })
})
