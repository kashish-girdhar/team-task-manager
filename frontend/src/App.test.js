import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login page for guests", () => {
  render(<App />);
  expect(screen.getByText(/log in to your workspace/i)).toBeInTheDocument();
});
