# Requirements Document: Event Loop Visualizer Web App

## 1. Overview

The goal is to build an interactive, browser-based visualizer that helps users understand how the JavaScript event loop works. The tool should let users write or load code snippets, step through execution, and see how the call stack, event queue, microtask queue, and web APIs interact in real time.

---

## 2. Roadmap & Phases

### Phase 1: Minimum Viable Product (MVP)

- **Code Editor**  
  - Built-in code editor (syntax highlighting, basic JS support)
  - Load example snippets
- **Visualization**  
  - Display Call Stack
  - Display Callback Queue (a.k.a. Task Queue)
  - Show Web APIs (timers, DOM events, etc.)
- **Controls**  
  - Play, Pause, Step-through execution
  - Reset, Restart code
- **Explanations**  
  - Brief, contextual descriptions of what happens at each step
- **Sample Scenarios**  
  - Bundled examples: setTimeout, promises, async/await, DOM events
- **UI/UX**  
  - Responsive, clean interface  
  - Works well on desktop and mobile

### Phase 2: Enhanced Features & Usability

- **Microtask Queue Visualization**  
  - Show Promises, MutationObservers, etc.
- **Advanced Code Analysis**
  - Highlight code lines as they execute
  - Error highlighting and explanations
- **Customizable Execution Speed**  
  - Slider for step/animation speed
- **User Annotations**  
  - Allow saving and sharing annotated sessions
- **Export/Share**  
  - Export visualizations as images or shareable links
- **Accessibility & Localization**  
  - Keyboard navigation, ARIA, high-contrast themes, multi-language support
- **Integration**  
  - Embed mode for docs/blogs

---

## 3. Functional Requirements

### 3.1 Code Input

- Built-in JS code editor (Monaco, Ace, or CodeMirror)
- Load sample code snippets
- (Optionally) Import/export code as files

### 3.2 Event Loop Visualization

- Visualize:
  - Call Stack
  - Task Queue (Callback Queue)
  - Web APIs area (timers, XHR, etc.)
  - (Phase 2) Microtask Queue
- Show movement of functions/callbacks between areas as code runs
- Highlight currently executing code in the editor

### 3.3 Execution Controls

- Play/Pause/Step/Restart
- Adjustable speed (Phase 2)

### 3.4 UI/UX

- Responsive design
- Contextual tooltips/explanations
- Sample code selector

### 3.5 Accessibility

- Keyboard navigation
- Screen reader support

### 3.6 UI Component Structure

- Common UI components such as **Button**, **Badge**, and other small, reusable elements will be organized under the `components/ui` directory.
- This ensures reusability and consistency across the application, and makes it easier to maintain and scale the UI.

---

## 4. Non-Functional Requirements

- All execution and visualization must happen client-side (no server code execution)
- Secure sandboxing of user code (e.g., using iframes or Web Workers)
- Compatible with latest Chrome, Firefox, Edge, Safari

---

## 5. Technical Stack Suggestions

- **Frontend Framework:** React **with TypeScript**
- **Code Editor:** Monaco Editor, CodeMirror, or Ace (integrated with TypeScript support)
- **Visualization:** D3.js for advanced animations
- **State Management:** React Context, Zustand
- **Sandboxing:** Use iframes or Web Workers for code isolation
- **Testing:** Vitest, React Testing Library
- **Deployment:** Vercel
- **Build Tool:** Vite

---

## 6. User Stories

1. As a user, I want to paste or write code and see how the event loop executes it.
2. As a user, I want to step through code execution and see changes in the call stack and queues.
3. As a user, I want to understand the difference between the task queue and the microtask queue.
4. As a user, I want visual explanations of what is happening at each step.
5. As a user, I want to share interesting event loop scenarios with others.

---

## 7. References

- [Loupe by Philip Roberts](http://latentflip.com/loupe/)
- [MDN: Concurrency model and Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [JavaScript Event Loop Explained](https://dev.to/lydiahallie/javascript-visualized-event-loop-3dif)

---