import { BrowserRouter, Routes, Route } from "react-router-dom";
import DocsLayout from "./components/layout/DocsLayout";
import { BasicTableExample } from "./pages/table/BasicTableExample";
import Home from "./pages/home/Home";
import "./globals.css";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/login/Login";
import CozyCare from "./pages/cozyCare/CozyCare";
import Game from "./game/ui/game";
import Library from "./pages/library/Library";

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
                        <Route path="/library" element={<Library />} />
                        <Route path="/game" element={<Game />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
