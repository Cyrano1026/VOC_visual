import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChartTestPage from "./page/ChartTestPage";
import ChartLine from "./page/ChartLine";

function App() {
  return (
    <BrowserRouter>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <header
          style={{
            padding: 16,
            backgroundColor: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* 가운데 타이틀 */}
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>VOC</h1>

          {/* 오른쪽 구석 날짜 */}
          <span
            style={{
              position: "absolute",
              right: 16,
              fontSize: 14,
              color: "#555",
            }}
          >
            last update - 2025-12-08
          </span>
        </header>


        <main
          style={{
            width: "100%",
            padding: 10,
            height: "100%",
            margin: "0 auto",
          }}
        >
          <Routes>
            <Route path="/*" element={<ChartLine />} />
            <Route path="/test1" element={<ChartTestPage />} />
            <Route path="/test2" element={<ChartTestPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
