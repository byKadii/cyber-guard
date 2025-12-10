import requests

# 🔗 الرابط المراد اختباره
url_to_test = "https://www.google.com"

# 🚀 إرسال الطلب إلى السيرفر
try:
    response = requests.post(
        "http://127.0.0.1:5000/predict",
        json={"url": url_to_test}
    )

    # ✅ محاولة قراءة الرد بصيغة JSON
    response.raise_for_status()  # يعطي خطأ واضح لو فيه مشكلة في الرد
    data = response.json()
    print("✅ Prediction:", data)

except requests.exceptions.RequestException as req_err:
    print("❌ Request error:", req_err)
    print("Raw response:", response.text if response else "No response")

except ValueError as json_err:
    print("❌ JSON parsing error:", json_err)
    print("Raw response:", response.text if response else "No response")