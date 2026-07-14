import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_PATH = r"C:\Users\mayan\Downloads\cards-f5abc-4ad15e562002.json"
PACKAGE_NAME = "com.digibouquet.app"

def main():
    if not os.path.exists(KEY_PATH):
        print(f"Error: JSON key file not found at {KEY_PATH}")
        return

    print("Authenticating...")
    try:
        credentials = service_account.Credentials.from_service_account_file(
            KEY_PATH, scopes=["https://www.googleapis.com/auth/playdeveloperreporting"]
        )
        
        reporting_service = build("playdeveloperreporting", "v1beta1", credentials=credentials)
    except Exception as e:
        print("Failed to authenticate or build service:", e)
        return

    try:
        print("Querying Crash Rate...")
        response = reporting_service.vitals().crashrate().query(
            name=f"apps/{PACKAGE_NAME}/crashRateMetricSet",
            body={
                "timelineSpec": {
                    "aggregationPeriod": "DAILY",
                    "startTime": {"year": 2026, "month": 5, "day": 1},
                    "endTime": {"year": 2026, "month": 6, "day": 30}
                },
                "metrics": ["crashRate"]
            }
        ).execute()
        print("Crash data response:", response)
    except Exception as e:
        print("Error fetching crash data:", e)

if __name__ == "__main__":
    main()
