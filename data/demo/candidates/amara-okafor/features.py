import pandas as pd


def weekly_sales(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate daily store sales into ISO weeks."""
    df = df.copy()
    df["week"] = pd.to_datetime(df["date"]).dt.isocalendar().week
    return df.groupby(["store_id", "week"], as_index=False)["sales"].sum()


if __name__ == "__main__":
    sample = pd.read_csv("data/sample_sales.csv")
    print(weekly_sales(sample).head())
