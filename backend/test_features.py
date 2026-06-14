import os
import time
import datetime
from fastapi.testclient import TestClient

# Force a clean test database URL
os.environ["DATABASE_URL"] = "sqlite:///./test_features.db"

from main import app
from database import init_db, SessionLocal, Glossary, TranslationMemory, engine

client = TestClient(app)

def setup_db():
    # Close any existing pool connections to avoid lock issues on Windows
    engine.dispose()
    if os.path.exists("test_features.db"):
        try:
            os.remove("test_features.db")
        except Exception as e:
            print(f"Warning: could not remove test db: {e}")
    init_db()

def test_glossary_sorting_and_crud():
    print("[Test] Glossary Sorting and CRUD Operations...")
    setup_db()
    
    # 1. Test empty state
    response = client.get("/api/glossary")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0

    # 2. Add glossary entries with different timestamps (simulate over time)
    # We will insert them directly into database to control timestamps or creation order.
    db = SessionLocal()
    
    t1 = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    t2 = datetime.datetime.utcnow() - datetime.timedelta(seconds=5)
    t3 = datetime.datetime.utcnow()
    
    g1 = Glossary(source_term="Apple", target_term="Táo", created_at=t1)
    g2 = Glossary(source_term="Banana", target_term="Chuối", created_at=t2)
    g3 = Glossary(source_term="Cherry", target_term="Anh đào", created_at=t3)
    
    db.add_all([g1, g2, g3])
    db.commit()
    db.close()
    
    # Verify Newest First (desc)
    response = client.get("/api/glossary?sort_order=desc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    items = data["items"]
    assert items[0]["source_term"] == "Cherry"
    assert items[1]["source_term"] == "Banana"
    assert items[2]["source_term"] == "Apple"

    # Verify Oldest First (asc)
    response = client.get("/api/glossary?sort_order=asc")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert items[0]["source_term"] == "Apple"
    assert items[1]["source_term"] == "Banana"
    assert items[2]["source_term"] == "Cherry"

    # 3. Test Modifying glossary term (update_glossary_term)
    g2_id = items[1]["id"]
    response = client.put(f"/api/glossary/{g2_id}", json={
        "source_term": "Blueberry",
        "target_term": "Việt quất"
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Updated successfully"
    
    # Confirm modification
    response = client.get("/api/glossary?sort_order=asc")
    items = response.json()["items"]
    assert items[1]["source_term"] == "Blueberry"
    assert items[1]["target_term"] == "Việt quất"

    # Test uniqueness verification during update (cannot conflict with existing term)
    response = client.put(f"/api/glossary/{g2_id}", json={
        "source_term": "Apple", # already exists as g1
        "target_term": "Táo mới"
    })
    assert response.status_code == 400
    assert "already exists in either Glossary or Memory" in response.json()["detail"]

    # 4. Test Bulk Delete (bulk_delete_glossary)
    g1_id = items[0]["id"]
    g3_id = items[2]["id"]
    
    response = client.post("/api/glossary/bulk-delete", json={"ids": [g1_id, g3_id]})
    assert response.status_code == 200
    assert "Successfully deleted 2 terms" in response.json()["message"]
    
    # Confirm they are deleted
    response = client.get("/api/glossary")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["source_term"] == "Blueberry"

    # 5. Test Export Glossary (export_glossary)
    response = client.get("/api/glossary/export")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    # 6. Test Clear All Glossary (clear_all_glossary)
    response = client.delete("/api/glossary")
    assert response.status_code == 200
    assert "successfully deleted" in response.json()["message"].lower()
    
    # Confirm empty database
    response = client.get("/api/glossary")
    assert response.json()["total"] == 0
    
    print("[Test] Glossary Sorting and CRUD Operations PASSED!")


def test_translation_memory_sorting_and_crud():
    print("[Test] Translation Memory Sorting and CRUD Operations...")
    setup_db()
    
    # 1. Test empty state
    response = client.get("/api/memory")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0

    # 2. Seed TM items with separate timestamps
    db = SessionLocal()
    t1 = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    t2 = datetime.datetime.utcnow() - datetime.timedelta(seconds=5)
    t3 = datetime.datetime.utcnow()
    
    tm1 = TranslationMemory(source_text="Hello", translated_text="Xin chào", created_at=t1)
    tm2 = TranslationMemory(source_text="Goodbye", translated_text="Tạm biệt", created_at=t2)
    tm3 = TranslationMemory(source_text="Thank you", translated_text="Cảm ơn", created_at=t3)
    
    db.add_all([tm1, tm2, tm3])
    db.commit()
    db.close()
    
    # Verify Newest First (desc)
    response = client.get("/api/memory?sort_order=desc")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    items = data["items"]
    assert items[0]["source_text"] == "Thank you"
    assert items[1]["source_text"] == "Goodbye"
    assert items[2]["source_text"] == "Hello"

    # Verify Oldest First (asc)
    response = client.get("/api/memory?sort_order=asc")
    items = response.json()["items"]
    assert items[0]["source_text"] == "Hello"
    assert items[1]["source_text"] == "Goodbye"
    assert items[2]["source_text"] == "Thank you"

    # 3. Test Modifying TM item (update_memory_entry)
    tm2_id = items[1]["id"]
    response = client.put(f"/api/memory/{tm2_id}", json={
        "source_text": "Good night",
        "translated_text": "Chúc ngủ ngon"
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Updated successfully"
    
    # Confirm modification
    response = client.get("/api/memory?sort_order=asc")
    items = response.json()["items"]
    assert items[1]["source_text"] == "Good night"
    assert items[1]["translated_text"] == "Chúc ngủ ngon"

    # Test uniqueness verification during update (cannot conflict with existing term)
    response = client.put(f"/api/memory/{tm2_id}", json={
        "source_text": "Hello", # already exists as tm1
        "translated_text": "Xin chào mới"
    })
    assert response.status_code == 400
    assert "already exists in either Glossary or Memory" in response.json()["detail"]

    # 4. Test Bulk Delete (bulk_delete_memory)
    tm1_id = items[0]["id"]
    tm3_id = items[2]["id"]
    
    response = client.post("/api/memory/bulk-delete", json={"ids": [tm1_id, tm3_id]})
    assert response.status_code == 200
    assert "Successfully deleted 2 entries" in response.json()["message"]
    
    # Confirm they are deleted
    response = client.get("/api/memory")
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["source_text"] == "Good night"

    # 5. Test Export Translation Memory (export_memory)
    response = client.get("/api/memory/export")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 6. Test Clear All Translation Memory (clear_all_memory)
    response = client.delete("/api/memory")
    assert response.status_code == 200
    assert "successfully deleted" in response.json()["message"].lower()

    # Confirm empty database
    response = client.get("/api/memory")
    assert response.json()["total"] == 0
    
    print("[Test] Translation Memory Sorting and CRUD Operations PASSED!")


def clean_up():
    engine.dispose()
    if os.path.exists("test_features.db"):
        try:
            os.remove("test_features.db")
        except Exception as e:
            print(f"Warning: could not remove test db: {e}")

if __name__ == "__main__":
    try:
        test_glossary_sorting_and_crud()
        test_translation_memory_sorting_and_crud()
        print("\nAll integration tests passed successfully!")
    finally:
        clean_up()
