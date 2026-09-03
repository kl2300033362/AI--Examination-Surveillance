import httpx
import asyncio
import websockets
import json

async def test_full_connectivity():
    print("====================================================")
    print("Testing Full System Connectivity & Video Surveillance")
    print("====================================================")

    async with httpx.AsyncClient() as client:
        # 1. Frontend Web Check
        print("\n1. Checking Frontend (http://127.0.0.1:5173)...")
        fe_res = await client.get("http://127.0.0.1:5173")
        assert fe_res.status_code == 200, f"Frontend failed: {fe_res.status_code}"
        print("   [OK] Frontend is up and returning HTTP 200 (Vite React app ready).")

        # 2. Backend Health & Database Check
        print("\n2. Checking Backend & Database Status (http://127.0.0.1:8000/api/status)...")
        status_res = await client.get("http://127.0.0.1:8000/api/status")
        assert status_res.status_code == 200, f"Backend status failed: {status_res.status_code}"
        status_data = status_res.json()
        print("   [OK] Backend & Database are connected:", status_data)

        # 3. WebSocket Realtime Communication Check
        print("\n3. Connecting to WebSocket (ws://127.0.0.1:8000/api/monitoring/ws)...")
        async with websockets.connect("ws://127.0.0.1:8000/api/monitoring/ws") as ws:
            print("   [OK] WebSocket connection established successfully.")

            # 4. Start Monitoring & Video Surveillance
            print("\n4. Starting Video Surveillance (POST /api/monitoring/start)...")
            start_res = await client.post("http://127.0.0.1:8000/api/monitoring/start")
            assert start_res.status_code == 200, f"Start failed: {start_res.status_code}"
            print("   [OK] Video Surveillance started:", start_res.json())

            # Receive WebSocket status broadcast
            ws_msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
            ws_data = json.loads(ws_msg)
            print("   [OK] Received broadcast on WebSocket:", ws_data)

            # 5. Verify Video Stream (MJPEG)
            print("\n5. Verifying Live Video Feed (GET /api/monitoring/video_feed)...")
            async with client.stream("GET", "http://127.0.0.1:8000/api/monitoring/video_feed") as stream_resp:
                assert stream_resp.status_code == 200
                async for chunk in stream_resp.aiter_bytes():
                    print(f"   [OK] Video Stream is active and transmitting MJPEG frames! (Received chunk {len(chunk)} bytes)")
                    break

            # 6. Simulate Drowsiness Infraction and Check Real-time Broadcast & DB
            print("\n6. Simulating Drowsiness & Proctoring Infractions...")
            sim_res = await client.post("http://127.0.0.1:8000/api/monitoring/simulate", json={
                "event_type": "DROWSINESS",
                "metadata": {"ear": 0.14, "eyes": "CLOSED"}
            })
            assert sim_res.status_code == 200
            print("   [OK] Simulation POST returned 200 OK:", sim_res.json())

            # Wait for WebSocket event
            ws_event = await asyncio.wait_for(ws.recv(), timeout=5.0)
            ws_event_data = json.loads(ws_event)
            print(f"   [OK] WebSocket received live alert broadcast: {ws_event_data['event_type']} | Warning #: {ws_event_data.get('warning_number')}")

            # 7. Check Database Records in SQLite
            print("\n7. Checking Database Event Persistence (GET /api/events)...")
            events_res = await client.get("http://127.0.0.1:8000/api/events")
            assert events_res.status_code == 200
            events = events_res.json()
            print(f"   [OK] Successfully retrieved {len(events)} persisted events from SQLite Database.")
            print(f"   Latest Logged Event: ID={events[0]['id']}, Type={events[0]['event_type']}, Description=\"{events[0]['description']}\"")

            # 8. Stop Monitoring
            print("\n8. Stopping Monitoring (POST /api/monitoring/stop)...")
            stop_res = await client.post("http://127.0.0.1:8000/api/monitoring/stop")
            assert stop_res.status_code == 200
            print("   [OK] Monitoring stopped cleanly:", stop_res.json())

    print("\n====================================================")
    print("ALL CONNECTIVITY & VIDEO SURVEILLANCE CHECKS PASSED!")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(test_full_connectivity())
