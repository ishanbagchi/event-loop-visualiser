# Contributing to Event Loop Visualiser

Thank you for your interest in contributing to the Event Loop Visualiser! This project aims to help developers understand JavaScript's event loop through interactive visualization.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn
-   Git

### Setting Up Development Environment

1. **Fork the repository**

    ```bash
    # Click the "Fork" button on GitHub, then clone your fork
    git clone https://github.com/YOUR_USERNAME/event-loop-visualiser.git
    cd event-loop-visualiser
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Start the development server**

    ```bash
    npm run dev
    ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application running.

## 🎯 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue templates** when available
3. **Provide clear reproduction steps** for bugs
4. **Include screenshots or GIFs** for UI-related issues

### Suggesting Features

When suggesting new features:

1. **Check if the feature aligns** with the project's educational goals
2. **Provide a clear use case** and explain the benefit
3. **Consider the complexity** and maintenance burden
4. **Include mockups or wireframes** if applicable

### Code Contributions

#### Types of Contributions Welcome

-   **Bug fixes** - Fix broken functionality
-   **Performance improvements** - Optimize rendering or execution
-   **New educational examples** - Add more JavaScript scenarios
-   **UI/UX improvements** - Enhance the visual design
-   **Documentation** - Improve README, comments, or guides
-   **Tests** - Add unit or integration tests
-   **Accessibility** - Make the app more accessible

#### Development Workflow

⚠️ **Important**: The `main` branch is protected. All changes must go through pull requests.

1. **Create a feature branch**

    ```bash
    git checkout main
    git pull origin main
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix
    ```

2. **Make your changes**

    - Write clean, readable code
    - Follow existing code style and patterns
    - Add comments for complex logic
    - Test your changes thoroughly

3. **Commit your changes**

    ```bash
    git add .
    git commit -m "feat: add new timeout visualization feature"
    ```

4. **Push to your fork**

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Create a Pull Request**
    - Use a clear, descriptive title
    - Fill out the PR template
    - Link any related issues
    - Add screenshots for UI changes
    - Wait for automated checks to pass
    - Respond to review feedback

📋 **Branch Protection**: See [Branch Protection Rules](.github/BRANCH_PROTECTION.md) for complete details.

## 📝 Code Style Guidelines

### General Principles

-   **Consistency** - Follow existing patterns in the codebase
-   **Readability** - Write code that's easy to understand
-   **Simplicity** - Prefer simple solutions over complex ones
-   **Performance** - Consider the impact on rendering performance

### TypeScript/JavaScript

-   Use **TypeScript** for all new files
-   Prefer **functional components** with hooks
-   Use **descriptive variable names**
-   Add **type annotations** for complex objects
-   Handle **error cases** appropriately

```typescript
// Good
const handleExecutionStep = (stepIndex: number): void => {
	if (stepIndex >= steps.length) {
		console.warn('Step index out of bounds')
		return
	}
	// ... execution logic
}

// Avoid
const handle = (i: any) => {
	// ... logic without type safety or error handling
}
```

### React Components

-   Keep components **small and focused**
-   Use **custom hooks** for complex state logic
-   Extract **reusable logic** into utility functions
-   Use **semantic HTML** elements

```tsx
// Good
interface ExecutionControlsProps {
	isRunning: boolean
	onPlay: () => void
	onPause: () => void
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
	isRunning,
	onPlay,
	onPause,
}) => {
	return (
		<div className="execution-controls">{/* ... component content */}</div>
	)
}
```

### CSS

-   Use **semantic class names**
-   Follow **BEM methodology** when appropriate
-   Prefer **CSS custom properties** for theming
-   Use **CSS Grid/Flexbox** for layouts
-   Keep **specificity low**

```css
/* Good */
.execution-controls {
	display: flex;
	gap: 0.75rem;
}

.execution-controls__button--primary {
	background: var(--color-primary);
	color: white;
}

/* Avoid */
.controls > div > button.btn.primary {
	/* ... overly specific selectors */
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

-   Write tests for **new functionality**
-   Focus on **user interactions** and **business logic**
-   Use **descriptive test names**
-   Mock **external dependencies**

```typescript
describe('ExecutionControls', () => {
	it('should disable play button when execution is complete', () => {
		// ... test implementation
	})

	it('should call onPlay when play button is clicked', () => {
		// ... test implementation
	})
})
```

## 📚 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/             # Basic UI components (Button, etc.)
│   ├── ExecutionControls.tsx
│   ├── CodeEditor.tsx
│   └── ...
├── hooks/              # Custom React hooks
├── store/              # State management (Zustand)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── samples/            # JavaScript code samples
```

## 🎨 Design Guidelines

### Visual Principles

-   **Educational Focus** - UI should support learning, not distract
-   **Clean & Minimal** - Avoid visual clutter
-   **Accessible** - Support screen readers and keyboard navigation
-   **Responsive** - Work well on different screen sizes

### Color Usage

-   Use colors **meaningfully** (e.g., green for success, red for errors)
-   Maintain **sufficient contrast** for accessibility
-   Be **consistent** with the existing color palette
-   Consider **color-blind users**

## 🚦 Pull Request Guidelines

### Before Submitting

-   [ ] Code follows the style guidelines
-   [ ] Tests pass locally
-   [ ] No console errors or warnings
-   [ ] Accessibility guidelines followed
-   [ ] Documentation updated if needed

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

-   [ ] Bug fix
-   [ ] New feature
-   [ ] Documentation update
-   [ ] Performance improvement
-   [ ] Refactoring

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Testing

-   [ ] Tested locally
-   [ ] Added/updated tests
-   [ ] Verified accessibility

## Related Issues

Closes #123
```

## 🏷️ Commit Message Format

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

-   `feat:` - New feature
-   `fix:` - Bug fix
-   `docs:` - Documentation changes
-   `style:` - Code style changes (formatting, etc.)
-   `refactor:` - Code refactoring
-   `perf:` - Performance improvements
-   `test:` - Adding or updating tests
-   `chore:` - Maintenance tasks

**Examples:**

```
feat(editor): add syntax highlighting for async/await
fix(controls): prevent double-click on play button
docs(readme): update installation instructions
style(components): format code with prettier
```

## 🤝 Code of Conduct

### Our Standards

-   **Be respectful** and inclusive
-   **Be constructive** in feedback
-   **Be patient** with newcomers
-   **Be collaborative** and help others

### Unacceptable Behavior

-   Harassment or discrimination
-   Trolling or insulting comments
-   Publishing private information
-   Spam or off-topic discussions

## 📞 Getting Help

-   **GitHub Issues** - For bugs and feature requests
-   **GitHub Discussions** - For questions and general discussion
-   **Code Reviews** - For getting feedback on your contributions

## 🎓 Learning Resources

If you're new to any of the technologies used:

-   **React**: [Official React Documentation](https://react.dev/)
-   **TypeScript**: [TypeScript Handbook](https://www.typescriptlang.org/docs/)
-   **Vite**: [Vite Guide](https://vitejs.dev/guide/)
-   **JavaScript Event Loop**: [MDN Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)

## 🙏 Recognition

Contributors will be recognized in:

-   GitHub contributors list
-   Project README
-   Release notes (for significant contributions)

Thank you for helping make JavaScript's event loop more accessible to developers worldwide! 🎉
