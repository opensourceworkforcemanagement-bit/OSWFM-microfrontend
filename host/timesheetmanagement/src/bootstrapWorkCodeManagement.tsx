import ReactDOM from "react-dom/client";
import WorkCodeManagement from "./WorkCodeManagement";

const container = document.getElementById("workcode");
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<WorkCodeManagement />);
}