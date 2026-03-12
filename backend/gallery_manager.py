import json
import os
import time
from typing import List, Dict, Any

# Determine the base directory for the backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GALLERY_FILE = os.path.join(BASE_DIR, "gallery_history.json")

class GalleryManager:
    def __init__(self, storage_path: str = GALLERY_FILE):
        self.storage_path = storage_path
        print(f"GalleryManager initialized with storage at: {self.storage_path}")
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, "w") as f:
                json.dump([], f)

    def add_entry(self, entry: Dict[str, Any]):
        """
        Adds a new generation entry to the gallery.
        Expected fields: original_image, mask_image, prompt, outputs, 
        final_image, timestamp
        """
        entry["id"] = str(int(time.time() * 1000))
        entry["timestamp"] = time.strftime("%Y-%m-%d %H:%M:%S")
        
        history = self.get_all_entries()
        history.insert(0, entry)  # Newest first
        
        # Keep only last 15 entries to prevent file bloat/browser crashes
        # 15 entries with multiple base64 images is already ~75MB+ JSON
        history = history[:15]
        
        with open(self.storage_path, "w") as f:
            json.dump(history, f) # No indent to save space
        return entry["id"]

    def get_all_entries(self) -> List[Dict[str, Any]]:
        try:
            if not os.path.exists(self.storage_path):
                return []
            with open(self.storage_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def delete_entry(self, entry_id: str) -> bool:
        history = self.get_all_entries()
        new_history = [e for e in history if e.get("id") != entry_id]
        if len(new_history) < len(history):
            with open(self.storage_path, "w") as f:
                json.dump(new_history, f)
            return True
        return False

    def get_entry(self, entry_id: str) -> Dict[str, Any]:
        history = self.get_all_entries()
        for e in history:
            if e.get("id") == entry_id:
                return e
        return None

_manager = None
def get_gallery_manager():
    global _manager
    if _manager is None:
        _manager = GalleryManager()
    return _manager
