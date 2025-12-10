import pandas as pd
import re
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from imblearn.over_sampling import SMOTE
import joblib

# 🧠 تحميل البيانات
df = pd.read_csv("malicious_url.csv", names=["url", "label"])

# 🔁 تحويل التصنيفات إلى أرقام
df["label"] = df["label"].map({"benign": 0, "phishing": 1})

# 🧹 حذف الصفوف اللي فيها NaN بعد التحويل
df = df.dropna(subset=["label"])

# ✨ استخراج ميزات محسّنة
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

df = extract_features(df)

# 🎯 تحديد الميزات والتصنيف
X = df.drop(columns=["url", "label"])
y = df["label"]

# ⚖️ موازنة البيانات
smote = SMOTE(k_neighbors=3, random_state=42)
X_resampled, y_resampled = smote.fit_resample(X, y)

# 📐 تحجيم الميزات
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_resampled)

# ✂️ تقسيم البيانات
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_resampled, test_size=0.2, random_state=42)

# 📦 المصنفات
models = {
    "Random Forest": RandomForestClassifier(
        n_estimators=500,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42
    ),
    "SVM": SVC(kernel='rbf', C=1.0, gamma='scale'),
    "Naive Bayes": GaussianNB()
}

# 📊 اختبار كل مصنف
results = []
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    results.append((name, model, acc))
    print(f"\n{name} Accuracy: {acc * 100:.2f}%")
    print(f"{name} Classification Report:")
    print(classification_report(y_test, y_pred))

# 🏆 اختيار الأفضل
best_name, best_model, best_acc = max(results, key=lambda x: x[2])
print(f"\n✅ Best Classifier: {best_name} With Accuracy: {best_acc * 100:.2f}%")

# 💾 حفظ النموذج الأفضل
joblib.dump(best_model, "best_model.pkl")