import { BrowserRouter, Routes, Route } from "react-router-dom";
import DocsLayout from "./components/layout/DocsLayout";
import { BasicTableExample } from "./pages/table/BasicTableExample";
import Home from "./pages/home/Home";
import "./globals.css";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/login/Login";
import CozyCare from "./pages/cozyCare/CozyCare";

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<DocsLayout />}>
                        <Route index element={<Home />} />
                        <Route
                            path="components/table"
                            element={<BasicTableExample />}
                        />
                        <Route path="/cozy-care" element={<CozyCare />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
