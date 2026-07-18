"""
models.py
Task 2: ARIMA (via pmdarima auto_arima) and LSTM (PyTorch) forecasting
models for Tesla's closing price, trained on a chronological train/test split.
"""

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error


def mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def metrics_dict(y_true, y_pred):
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "MAPE": mape(y_true, y_pred),
    }


def chronological_split(series: pd.Series, split_date: str):
    train = series[series.index < split_date]
    test = series[series.index >= split_date]
    return train, test


# ---------------------------------------------------------------- ARIMA ----

def fit_arima(train: pd.Series):
    """Fits an auto_arima model, searching (p,d,q) by AIC."""
    import pmdarima as pm
    model = pm.auto_arima(
        train, start_p=0, start_q=0, max_p=5, max_q=5, d=None,
        seasonal=False, stepwise=True, suppress_warnings=True,
        error_action="ignore", trace=False,
    )
    return model


def forecast_arima(model, n_periods: int):
    forecast, conf_int = model.predict(n_periods=n_periods, return_conf_int=True, alpha=0.05)
    return np.asarray(forecast), np.asarray(conf_int)


# ----------------------------------------------------------------- LSTM ----

class LSTMForecaster(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=2, dropout=0.2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers,
                             batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


def make_sequences(values: np.ndarray, window: int = 60):
    X, y = [], []
    for i in range(window, len(values)):
        X.append(values[i - window:i])
        y.append(values[i])
    return np.array(X), np.array(y)


def train_lstm(train: pd.Series, window: int = 60, hidden_size: int = 64,
                num_layers: int = 2, epochs: int = 40, batch_size: int = 32,
                lr: float = 1e-3, seed: int = 42):
    torch.manual_seed(seed)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(train.values.reshape(-1, 1)).flatten()

    X, y = make_sequences(scaled, window)
    X = torch.tensor(X, dtype=torch.float32).unsqueeze(-1)
    y = torch.tensor(y, dtype=torch.float32).unsqueeze(-1)

    model = LSTMForecaster(hidden_size=hidden_size, num_layers=num_layers)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.MSELoss()

    history = []
    n = X.shape[0]
    for epoch in range(epochs):
        model.train()
        perm = torch.randperm(n)
        epoch_loss = 0.0
        for i in range(0, n, batch_size):
            idx = perm[i:i + batch_size]
            xb, yb = X[idx], y[idx]
            optimizer.zero_grad()
            pred = model(xb)
            loss = loss_fn(pred, yb)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * len(idx)
        history.append(epoch_loss / n)

    return model, scaler, history


def forecast_lstm(model, scaler, train: pd.Series, test_len: int, window: int = 60):
    """Iteratively forecasts test_len steps ahead, feeding predictions back in."""
    model.eval()
    scaled_train = scaler.transform(train.values.reshape(-1, 1)).flatten()
    window_vals = list(scaled_train[-window:])
    preds_scaled = []
    with torch.no_grad():
        for _ in range(test_len):
            x = torch.tensor(window_vals[-window:], dtype=torch.float32).view(1, window, 1)
            pred = model(x).item()
            preds_scaled.append(pred)
            window_vals.append(pred)
    preds = scaler.inverse_transform(np.array(preds_scaled).reshape(-1, 1)).flatten()
    return preds