import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ContractPage } from "./pages/ContractPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/c/:contractId" element={<ContractPage />} />
      </Routes>
    </BrowserRouter>
  );
}
