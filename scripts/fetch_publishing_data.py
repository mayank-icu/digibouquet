import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_PATH = r"C:\Users\mayan\Downloads\cards-f5abc-4ad15e562002.json"
PACKAGE_NAME = "com.digibouquet.app"

def main():
    try:
        credentials = service_account.Credentials.from_service_account_file(
            KEY_PATH, scopes=["https://www.googleapis.com/auth/androidpublisher"]
        )
        
        publisher_service = build("androidpublisher", "v3", credentials=credentials)
    except Exception as e:
        print("Failed to authenticate:", e)
        return

    # Fetch Reviews
    try:
        with open("play_data_output.txt", "w", encoding="utf-8") as f:
            f.write("--- Fetching Recent Reviews ---\n")
            reviews_response = publisher_service.reviews().list(packageName=PACKAGE_NAME, maxResults=10).execute()
            
            if 'reviews' in reviews_response:
                for review in reviews_response['reviews']:
                    comments = review.get('comments', [])
                    if comments and 'userComment' in comments[0]:
                        user_comment = comments[0]['userComment']
                        star_rating = user_comment.get('starRating', 0)
                        text = user_comment.get('text', '')
                        f.write(f"[{star_rating} Stars] {text}\n")
            else:
                f.write("No reviews found.\n")
                
            f.write("\n--- Fetching Store Listings (Keywords & Descriptions) ---\n")
            edit_request = publisher_service.edits().insert(body={}, packageName=PACKAGE_NAME)
            edit = edit_request.execute()
            edit_id = edit['id']
            
            listings_response = publisher_service.edits().listings().list(packageName=PACKAGE_NAME, editId=edit_id).execute()
            
            if 'listings' in listings_response:
                for listing in listings_response['listings']:
                    lang = listing.get('language')
                    title = listing.get('title')
                    short_desc = listing.get('shortDescription')
                    full_desc = listing.get('fullDescription')
                    f.write(f"\nLanguage: {lang}\n")
                    f.write(f"Title: {title}\n")
                    f.write(f"Short Desc: {short_desc}\n")
                    f.write(f"Full Desc: {full_desc}\n")
            else:
                f.write("No listings found.\n")
                
            f.write("\n--- Fetching Custom Store Listings ---\n")
            try:
                custom_listings = publisher_service.edits().customapplistings().list(packageName=PACKAGE_NAME, editId=edit_id).execute()
                f.write(f"Custom Listings Response: {custom_listings}\n")
            except Exception as inner_e:
                f.write(f"Error fetching custom listings: {inner_e}\n")
                
    except Exception as e:
        print("Error fetching data:", e)

if __name__ == "__main__":
    main()
