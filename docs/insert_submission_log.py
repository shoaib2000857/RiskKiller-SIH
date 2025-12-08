import psycopg2
import psycopg2.extras
from psycopg2 import sql

def insert_submission_log(
    input_text,
    file_path,
    metadata,
    user_ip,
    location_data,
    device_info,
    network_info,
    browser_info,
    db_config
):
    """
    Inserts a new record into submission_logs using L1 credentials.
    db_config: dict with keys host, dbname, user, password, port
    """
    try:
        conn = psycopg2.connect(
            host=db_config['host'],
            dbname=db_config['dbname'],
            user=db_config['user'],
            password=db_config['password'],
            port=db_config.get('port', 5432)
        )
        with conn:
            with conn.cursor() as cur:
                insert_query = sql.SQL("""
                    INSERT INTO submission_logs (
                        input_text, file_path, metadata, user_ip,
                        location_data, device_info, network_info, browser_info
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """)
                cur.execute(insert_query, (
                    input_text,
                    file_path,
                    psycopg2.extras.Json(metadata) if metadata else None,
                    user_ip,
                    psycopg2.extras.Json(location_data) if location_data else None,
                    device_info,
                    network_info,
                    browser_info
                ))
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

# Example usage:
if __name__ == "__main__":
    db_config = {
        'host': 'localhost',
        'dbname': 'your_db',
        'user': 'l1_naive_user',
        'password': 'strong_l1_password'
    }
    insert_submission_log(
        input_text="Sample input",
        file_path="/images/sample.png",
        metadata={"foo": "bar"},
        user_ip="192.168.1.1",
        location_data={"lat": 12.34, "lon": 56.78},
        device_info="Android Phone",
        network_info="WiFi-Home",
        browser_info="Chrome/120.0",
        db_config=db_config
    )
