import pandas as pd
import numpy as np
import re
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import joblib

# 🧠 تحميل البيانات
df = pd.read_csv("malicious_url.csv")

# 6✨ استخراج الميزات من الرابط
def extract_features(df):
    df["url_length"] = df["url"].apply(len)
    df["num_dots"] = df["url"].apply(lambda x: x.count('.'))
    df["num_special_chars"] = df["url"].apply(lambda x: sum(x.count(c) for c in ['@', '?', '=', '&', '-', '_']))
    df["has_ip"] = df["url"].apply(lambda x: 1 if re.match(r'\d+\.\d+\.\d+\.\d+', x) else 0)
    df["has_https"] = df["url"].apply(lambda x: 1 if "https" in x.lower() else 0)
    df["num_parts"] = df["url"].apply(lambda x: len(x.split('/')))
    df["has_encoding"] = df["url"].apply(lambda x: 1 if any(tag in x.lower() for tag in ["base64", "javascript:", "data:"]) else 0)
    df["num_digits"] = df["url"].apply(lambda x: sum(c.isdigit() for c in x))
    df["num_uppercase"] = df["url"].apply(lambda x: sum(c.isupper() for c in x))
    df["domain_length"] = df["url"].apply(lambda x: len(x.split('/')[2]) if len(x.split('/')) > 2 else 0)
    df["num_subdomains"] = df["url"].apply(lambda x: len(x.split('.')) - 2 if len(x.split('.')) > 2 else 0)
    df["has_port"] = df["url"].apply(lambda x: 1 if re.search(r":\d+", x) else 0)
    df["query_length"] = df["url"].apply(lambda x: len(x.split('?')[1]) if '?' in x else 0)
    suspicious_words = ["login", "verify", "secure", "account", "update", "confirm", "bank", "reset", "free", "click", "offer", "win", "paypal", "ebay"]
    df["suspicious_words"] = df["url"].apply(lambda x: 1 if any(word in x.lower() for word in suspicious_words) else 0)
    return df

# 🧪 تطبيق دالة استخراج الميزات
df = extract_features(df)

# 🎯 تحديد الميزات والهدف
X = df.drop(columns=["url", "label"])  # تحديد المدخلات
y = df["label"]

# 🔁 تحويل التصنيفات إلى أرقام
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# 📐 تحجيم الميزات
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 🧠 تدريب النموذج
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_scaled, y_encoded)

# 💾 حفظ النموذج والـ scaler والـ encoder
joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(le, "label_encoder.pkl")
print("✅ Training complete. Model saved with enhanced features.")