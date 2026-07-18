import { useState } from "react";
import "./App.css";
import TickerTape from "./components/TickerTape";
import Hero from "./components/Hero";
import Sidebar from "./components/Sidebar";
import Task1Eda from "./sections/Task1Eda";
import Task2Models from "./sections/Task2Models";
import Task3Forecast from "./sections/Task3Forecast";
import Task4Portfolio from "./sections/Task4Portfolio";
import Task5Backtest from "./sections/Task5Backtest";

const SECTIONS = {
  eda: Task1Eda,
  models: Task2Models,
  forecast: Task3Forecast,
  portfolio: Task4Portfolio,
  backtest: Task5Backtest,
};

export default function App() {
  const [active, setActive] = useState("eda");
  const Active = SECTIONS[active];

  return (
    <div className="app">
      <TickerTape />
      <div className="shell">
        <Sidebar active={active} onChange={setActive} />
        <div className="content-area">
          <Hero />
          <main className="main">
            <Active />
          </main>
          <footer className="footer">
            <div className="footer-inner">
              <span className="mono">GMF Investments · Portfolio Forecasting Terminal</span>
              <span className="mono footer-dim">
                Data: yfinance (TSLA / BND / SPY), 2015-01-01 → 2026-01-15 · ARIMA + LSTM + MPT · Built with React &amp; Python
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}