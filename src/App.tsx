import { BrowserRouter, Routes, Route } from "react-router-dom";
import DocsLayout from "./components/layout/DocsLayout";
import { BasicTableExample } from "./pages/table/BasicTableExample";
import Home from "./pages/home/Home";
import "./globals.css";
import DietTracker from "./pages/dietTracker/DietTracker";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./pages/login/Login";
import DietTrackerV2 from "./pages/dietTracker_v2/dietTracker_v2";

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
                        <Route path="diet-tracker" element={<DietTracker />} />
                        <Route
                            path="/diet-tracker-v2"
                            element={<DietTrackerV2 />}
                        />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
