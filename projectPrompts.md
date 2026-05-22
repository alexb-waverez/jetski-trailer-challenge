### **Ideal Prompt:**

**Project Goal:**

Create a responsive web application called "Jet Ski Trailer Skills Challenge" to manage and time a competition. The app needs to handle competitor registration, live timing with penalty tracking, and a final results leaderboard with data visualization and a PDF export option.

**Technical Specifications:**

*   **Framework:** React with TypeScript for type safety.
*   **Styling:** Tailwind CSS for a modern, utility-first approach.
*   **Routing:** Use `react-router-dom` to manage navigation between pages.
*   **Charting:** Use Chart.js to visualize results.
*   **PDF Export:** Use `jsPDF` and `html2canvas` for generating a PDF of the results.
*   **State Management:** Use React's built-in state management (e.g., `useState`). No external libraries are needed.

**Application Structure and Pages:**

The application should have a persistent header and three main pages:

1.  **Header Component:**
    *   Display the application name/logo.
    *   Provide clear navigation links to "Home," "Competition," and "Results."
    *   Must be fully responsive, collapsing into a hamburger menu on mobile devices.

2.  **Home Page (`/`) - Competitor Registration:**
    *   A form to add new competitors with "Full Name" and "Company Name" fields.
    *   Display a list of all currently registered competitors.
    *   Include a "Reset All" button that clears all competitor data from the application.

3.  **Competition Page (`/competition`) - Live Timing:**
    *   Display each competitor in a separate card.
    *   Each card must include:
        *   The competitor's name and company.
        *   A timer display (format `MM:SS.ms`).
        *   A primary button to "Start," "Stop," and show "Finished" status. The button's color and text should change based on the competitor's status (e.g., green for start, red for stop).
        *   Controls (`+` and `-` buttons) to add or remove penalty points. Each penalty adds 5 seconds to the final time.
        *   A "Disqualify" button that can be toggled to "Reinstate" the competitor. Disqualified competitors' cards should be visually distinct.

4.  **Results Page (`/results`) - Leaderboard and Analysis:**
    *   A "Save as PDF" button that captures the results section and downloads it.
    *   Display a ranked leaderboard of all competitors who have completed their run, sorted by the fastest final time (Run Time + Penalty Time).
    *   The top 3 ranks should have unique styling (e.g., gold, silver, bronze color highlights).
    *   A separate section below the main leaderboard to list all disqualified competitors.
    *   A stacked bar chart visualizing each competitor's performance, showing a breakdown of their "Run Time" versus their "Penalty Time."

**Data Model (`types.ts`):**

The application's logic should be based on the following `Competitor` data structure and `CompetitorStatus` enum:

```typescript
export enum CompetitorStatus {
  Pending = 'Pending',
  Running = 'Running',
  Finished = 'Finished',
  Disqualified = 'Disqualified',
}

export interface Competitor {
  id: string; // Unique identifier
  fullName: string;
  companyName: string;
  startTime: number | null;
  endTime: number | null;
  elapsedTime: number | null;
  status: CompetitorStatus;
  penaltyPoints: number;
}
```

**UI/UX Design Guidelines:**

*   **Theme:** Implement a modern dark theme with a dark gray background, light text, and a vibrant accent color (like sky blue) for interactive elements, links, and headers.
*   **Layout:** Ensure the layout is clean, centered, and fully responsive, providing an excellent experience on both mobile and desktop devices.
*   **Typography:** Use a clean sans-serif font for readability and a monospaced font for the timer display to prevent text-shifting during updates.
*   **User Feedback:** The UI should be intuitive. Buttons should have clear hover/focus states, and empty states (e.g., "No competitors registered") should be handled gracefully.
